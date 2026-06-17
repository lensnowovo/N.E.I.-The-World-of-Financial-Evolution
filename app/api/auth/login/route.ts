import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { setSession } from '@/lib/session';
import { isEmail, isPassword, isCode } from '@/lib/validate';

export async function POST(req: Request) {
  const { email, password, code, mode } = await req.json();
  if (!isEmail(email)) return NextResponse.json({ error: '请输入有效的邮箱地址' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: '账号不存在' }, { status: 404 });

  if (mode === 'code') {
    if (!isCode(code)) return NextResponse.json({ error: '验证码格式不正确' }, { status: 400 });
    const verificationCode = await prisma.verificationCode.findFirst({
      where: { email, code, consumed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!verificationCode) return NextResponse.json({ error: '验证码无效或已过期' }, { status: 400 });
    await prisma.verificationCode.update({ where: { id: verificationCode.id }, data: { consumed: true } });
  } else {
    if (!isPassword(password)) return NextResponse.json({ error: '密码格式不正确' }, { status: 400 });
    if (!user.passwordHash) return NextResponse.json({ error: '该账号未设置密码，请使用其他方式登录' }, { status: 400 });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
  }

  await setSession(user.id);
  return NextResponse.json({ id: user.id, nickname: user.nickname, role: user.role });
}
