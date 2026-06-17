import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { isNickname, hasSensitive } from '@/lib/validate';

/**
 * PATCH /api/users/me —— 更新当前登录用户的资料
 *
 * 可改字段：nickname, role, institution, bio, avatarUrl
 * avatarUrl 允许清空（传空串）。bio 最长 200 字符。
 *
 * 不改密码——密码有独立的重置接口。
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

  const update: Record<string, unknown> = {};
  if (nickname !== undefined) {
    if (!isNickname(nickname)) return NextResponse.json({ error: '昵称需 2-20 字符' }, { status: 400 });
    if (hasSensitive(nickname)) return NextResponse.json({ error: '昵称包含敏感词' }, { status: 400 });
    // 唯一性：排除自己
    const dup = await prisma.user.findFirst({ where: { nickname, NOT: { id: me.id } } });
    if (dup) return NextResponse.json({ error: '昵称已被使用' }, { status: 409 });
    update.nickname = nickname;
  }
  if (role !== undefined) {
    if (!['VC', 'PE', 'FA'].includes(role)) {
      return NextResponse.json({ error: '身份无效' }, { status: 400 });
    }
    update.role = role;
  }
  if (institution !== undefined) update.institution = institution;
  if (bio !== undefined) update.bio = bio;
  if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '没有要更新的字段' }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: me.id },
    data: update,
    select: {
      id: true,
      nickname: true,
      role: true,
      institution: true,
      bio: true,
      avatarUrl: true,
    },
  });
  return NextResponse.json(updated);
}

// 顺便支持查当前用户（GET，给 settings 页用）
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  return NextResponse.json(me);
}
