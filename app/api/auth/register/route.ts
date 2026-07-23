import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { setSession } from '@/lib/session';
import { isEmail, isNickname, isPassword, isCode, hasSensitive } from '@/lib/validate';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIpFromRequest } from '@/lib/client-ip';
import { shouldBootstrapAdmin } from '@/lib/admin';
import { isInvestorRole } from '@/lib/roles';
import {
  isCurrentRegistrationConsent,
  REQUIRED_REGISTRATION_CONSENTS,
} from '@/lib/legal';

// IP 级别限流，防止脚本批量注册尝试（注册本身受验证码约束，这里做基础 IP 防护）
const IP_LIMIT = 10;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: '请求格式不正确' }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const code = typeof raw.code === 'string' ? raw.code : '';
  const role = typeof raw.role === 'string' ? raw.role : '';
  const nickname = typeof raw.nickname === 'string' ? raw.nickname : '';
  const password = typeof raw.password === 'string' ? raw.password : '';
  const {
    termsAccepted,
    privacyAccepted,
    adultConfirmed,
    crossBorderAccepted,
    termsVersion,
    privacyVersion,
  } = raw;

  // IP 限流优先于业务校验：阻断脚本早返回
  const ip = getClientIpFromRequest(req);
  const ipRl = checkRateLimit(`register:ip:${ip}`, IP_LIMIT, WINDOW_MS);
  if (!ipRl.ok) {
    const retryAfterSec = Math.max(1, Math.ceil(ipRl.retryAfter / 1000));
    return NextResponse.json(
      { error: '请求过于频繁，请稍后再试', retryAfter: retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
    );
  }

  if (!isEmail(email)) return NextResponse.json({ error: '请输入有效的邮箱地址' }, { status: 400 });
  if (!isCode(code)) return NextResponse.json({ error: '验证码格式不正确' }, { status: 400 });
  if (!isInvestorRole(role)) return NextResponse.json({ error: '请选择身份' }, { status: 400 });
  if (!isNickname(nickname)) return NextResponse.json({ error: '昵称需 2-20 字符' }, { status: 400 });
  if (hasSensitive(nickname)) return NextResponse.json({ error: '昵称包含敏感词' }, { status: 400 });
  if (!isPassword(password)) return NextResponse.json({ error: '密码需 8-20 位，含字母和数字' }, { status: 400 });
  if (!isCurrentRegistrationConsent({ termsAccepted, privacyAccepted, adultConfirmed, crossBorderAccepted, termsVersion, privacyVersion })) {
    return NextResponse.json(
      { error: '请阅读并同意当前版本的用户协议和隐私政策后再注册' },
      { status: 400 },
    );
  }

  // 校验邮箱验证码
  const verificationCode = await prisma.verificationCode.findFirst({
    where: { email, code, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!verificationCode) return NextResponse.json({ error: '验证码无效或已过期' }, { status: 400 });

  // 唯一性
  const exists = await prisma.user.findFirst({
    where: { OR: [{ email }, { nickname }] },
  });
  if (exists) {
    if (exists.email === email) return NextResponse.json({ error: '该邮箱已注册' }, { status: 409 });
    return NextResponse.json({ error: '昵称已被使用' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userAgent = req.headers.get('user-agent')?.slice(0, 512) || null;
  const user = await prisma.$transaction(async (tx) => {
    const consumed = await tx.verificationCode.updateMany({
      where: {
        id: verificationCode.id,
        email,
        code,
        consumed: false,
        expiresAt: { gt: new Date() },
      },
      data: { consumed: true },
    });
    if (consumed.count !== 1) throw new Error('VERIFICATION_CODE_CONSUMED');

    const created = await tx.user.create({
      data: { email, role, nickname, passwordHash, isAdmin: shouldBootstrapAdmin(email) },
    });
    await tx.userConsent.createMany({
      data: REQUIRED_REGISTRATION_CONSENTS.map((consent) => ({
        userId: created.id,
        consentType: consent.consentType,
        version: consent.version,
        ipAddress: ip === 'unknown' ? null : ip,
        userAgent,
      })),
    });
    return created;
  }).catch((error) => {
    if (error instanceof Error && error.message === 'VERIFICATION_CODE_CONSUMED') return null;
    throw error;
  });

  if (!user) {
    return NextResponse.json({ error: '验证码已使用或已过期，请重新获取' }, { status: 409 });
  }
  await setSession(user.id);

  return NextResponse.json({ id: user.id, nickname: user.nickname, role: user.role });
}
