import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { isEmail, isPassword } from '@/lib/validate';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// IP 级别限流，防止验证码爆破（密码重置是高价值目标，单独限流）
const IP_LIMIT = 10;
const WINDOW_MS = 10 * 60 * 1000;

/**
 * POST /api/auth/reset-password
 *
 * 轻量密码重置：邮箱 + 验证码 + 新密码。
 * 复用 verify-email 的验证码（同一个 VerificationCode 表，type='register' 兼用）。
 *
 * 流程：用户在登录页点"忘记密码" → 输邮箱发码 → 输验证码+新密码 → 本接口校验+改密。
 *
 * 注：GitHub OAuth 用户（passwordHash 为 null）改密后会同时支持密码登录。
 */
export async function POST(req: Request) {
  const { email, code, newPassword } = await req.json();

  // IP 限流优先：防止脚本枚举验证码
  const ip = getClientIp(req);
  const ipRl = checkRateLimit(`reset-password:ip:${ip}`, IP_LIMIT, WINDOW_MS);
  if (!ipRl.ok) {
    const retryAfterSec = Math.max(1, Math.ceil(ipRl.retryAfter / 1000));
    return NextResponse.json(
      { error: '请求过于频繁，请稍后再试', retryAfter: retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
    );
  }

  if (!isEmail(email)) return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
  if (!/^\d{6}$/.test(String(code || ''))) return NextResponse.json({ error: '验证码格式不正确' }, { status: 400 });
  if (!isPassword(newPassword)) return NextResponse.json({ error: '密码需 8-20 位，含字母和数字' }, { status: 400 });

  // 校验验证码
  const verificationCode = await prisma.verificationCode.findFirst({
    where: { email, code: String(code), consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!verificationCode) return NextResponse.json({ error: '验证码无效或已过期' }, { status: 400 });

  // 用户必须存在（重置不是注册）
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: '该邮箱未注册' }, { status: 404 });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.verificationCode.update({ where: { id: verificationCode.id }, data: { consumed: true } }),
  ]);

  return NextResponse.json({ ok: true });
}
