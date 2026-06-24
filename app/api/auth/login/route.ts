import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { setSession } from '@/lib/session';
import { isEmail, isPassword, isCode } from '@/lib/validate';
import { checkRateLimit } from '@/lib/rate-limit';

// 暴力破解防护：同 email 5 次失败 / 15min 后拒绝。注意：成功登录不计入。
const LOGIN_FAIL_LIMIT = 5;
const LOGIN_FAIL_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
  const { email, password, code, mode } = await req.json();
  if (!isEmail(email)) return NextResponse.json({ error: '请输入有效的邮箱地址' }, { status: 400 });

  /**
   * 记录一次失败登录尝试；若已达上限返回 429 响应，否则返回 null。
   * 仅在「认证失败」路径调用（用户不存在 / 验证码错 / 密码错 / 未设密码），
   * 输入格式校验失败与成功登录均不计入 —— 前者算 client 侧错误，后者是正常行为。
   */
  const onAuthFail = (): NextResponse | null => {
    const rl = checkRateLimit(
      `login:email:${email.toLowerCase()}`,
      LOGIN_FAIL_LIMIT,
      LOGIN_FAIL_WINDOW_MS
    );
    if (!rl.ok) {
      const retryAfterSec = Math.max(1, Math.ceil(rl.retryAfter / 1000));
      return NextResponse.json(
        { error: '登录尝试过于频繁，请稍后再试' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
      );
    }
    return null;
  };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const limited = onAuthFail();
    if (limited) return limited;
    // 用户枚举模糊（US-007）：账号不存在时不再返回 "账号不存在"，
    // 改为按当前登录模式返回与「凭证错误」完全一致的通用错误 + 状态码，
    // 使攻击者无法通过响应差异判断邮箱是否已注册。
    if (mode === 'code') {
      return NextResponse.json({ error: '验证码无效或已过期' }, { status: 400 });
    }
    return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
  }

  if (mode === 'code') {
    if (!isCode(code)) return NextResponse.json({ error: '验证码格式不正确' }, { status: 400 });
    const verificationCode = await prisma.verificationCode.findFirst({
      where: { email, code, consumed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!verificationCode) {
      const limited = onAuthFail();
      if (limited) return limited;
      return NextResponse.json({ error: '验证码无效或已过期' }, { status: 400 });
    }
    await prisma.verificationCode.update({ where: { id: verificationCode.id }, data: { consumed: true } });
  } else {
    if (!isPassword(password)) return NextResponse.json({ error: '密码格式不正确' }, { status: 400 });
    if (!user.passwordHash) {
      const limited = onAuthFail();
      if (limited) return limited;
      return NextResponse.json({ error: '该账号未设置密码，请使用其他方式登录' }, { status: 400 });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      const limited = onAuthFail();
      if (limited) return limited;
      return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
    }
  }

  await setSession(user.id);
  return NextResponse.json({ id: user.id, nickname: user.nickname, role: user.role });
}
