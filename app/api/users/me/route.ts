import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, getSessionUid } from '@/lib/session';
import { isNickname, hasSensitive } from '@/lib/validate';
import { encryptApiKey } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/users/me —— 更新当前登录用户的资料
 * 可改字段：nickname, role, institution, bio, avatarUrl, apiKey
 */
export async function PATCH(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const data = await req.json();
  const nickname = typeof data.nickname === 'string' ? data.nickname.trim() : undefined;
  const role = typeof data.role === 'string' ? data.role : undefined;
  const institution = data.institution === undefined ? undefined : String(data.institution).trim() || null;
  const bio = data.bio === undefined ? undefined : String(data.bio).trim().slice(0, 200) || null;
  const avatarUrl = data.avatarUrl === undefined ? undefined : String(data.avatarUrl).trim() || null;
  const apiKey = data.apiKey === undefined ? undefined : String(data.apiKey).trim();

  const update: Record<string, unknown> = {};
  if (nickname !== undefined) {
    if (!isNickname(nickname)) return NextResponse.json({ error: '昵称需 2-20 字符' }, { status: 400 });
    if (hasSensitive(nickname)) return NextResponse.json({ error: '昵称包含敏感词' }, { status: 400 });
    const dup = await prisma.user.findFirst({ where: { nickname, NOT: { id: me.id } } });
    if (dup) return NextResponse.json({ error: '昵称已被使用' }, { status: 409 });
    update.nickname = nickname;
  }
  if (role !== undefined) {
    if (!['VC', 'PE', 'FA'].includes(role)) return NextResponse.json({ error: '身份无效' }, { status: 400 });
    update.role = role;
  }
  if (institution !== undefined) update.institution = institution;
  if (bio !== undefined) update.bio = bio;
  if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;
  if (apiKey !== undefined) {
    if (!apiKey) return NextResponse.json({ error: 'API key 不能为空' }, { status: 400 });
    update.apiKeyEnc = encryptApiKey(apiKey);
  }

  if (Object.keys(update).length === 0) return NextResponse.json({ error: '没有要更新的字段' }, { status: 400 });

  await prisma.user.update({ where: { id: me.id }, data: update });
  return NextResponse.json({ ok: true });
}

/** GET /api/users/me —— 查当前用户（不返回 apiKey 密文） */
export async function GET() {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { id: true, email: true, nickname: true, role: true, avatarUrl: true, institution: true, bio: true, createdAt: true, apiKeyEnc: true },
  });
  if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  const { apiKeyEnc, ...safe } = user;
  return NextResponse.json({ ...safe, hasApiKey: !!apiKeyEnc });
}

/** DELETE /api/users/me —— 清除 API key */
export async function DELETE() {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  await prisma.user.update({ where: { id: uid }, data: { apiKeyEnc: null } });
  return NextResponse.json({ ok: true });
}
