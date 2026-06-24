import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isEmail } from '@/lib/validate';
import { sendVerificationEmail } from '@/lib/email';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// 防滥用：同 email 3 次 / 10min，同 IP 10 次 / 10min（拦截邮箱轰炸 + 分布式刷码）
const EMAIL_LIMIT = 3;
const IP_LIMIT = 10;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email || !isEmail(email)) {
    return NextResponse.json({ error: '请输入有效的邮箱地址' }, { status: 400 });
  }

  // Rate limit：两个维度都检查，命中任一则 429；key 用小写邮箱避免大小写绕过
  const normalizedEmail = email.toLowerCase();
  const ip = getClientIp(req);
  const emailRl = checkRateLimit(
    `verify-email:email:${normalizedEmail}`,
    EMAIL_LIMIT,
    WINDOW_MS
  );
  const ipRl = checkRateLimit(`verify-email:ip:${ip}`, IP_LIMIT, WINDOW_MS);
  if (!emailRl.ok || !ipRl.ok) {
    const retryAfterMs = Math.max(
      emailRl.ok ? 0 : emailRl.retryAfter,
      ipRl.ok ? 0 : ipRl.retryAfter
    );
    const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
    return NextResponse.json(
      { error: '发送过于频繁，请稍后再试', retryAfter: retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
    );
  }

  // Generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000));

  await prisma.verificationCode.create({
    data: {
      email,
      code,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  // Send email (silently skips in dev without API key)
  try {
    await sendVerificationEmail(email, code, 'register');
  } catch (err) {
    console.error('Failed to send verification email:', err);
  }

  // 仅在开发环境返回验证码，方便本地测试；生产环境绝不暴露，否则邮箱验证形同虚设
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: true, devCode: code });
}
