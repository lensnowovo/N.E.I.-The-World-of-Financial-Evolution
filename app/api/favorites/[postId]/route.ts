import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUid } from '@/lib/session';
import { ACTIVITY_EVENT, trackActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/favorites/[postId] —— 更新备注或排序
 *
 * Body: { note?: string, sortOrder?: number }
 * 交换排序逻辑：前端传新的 sortOrder 值，直接写入
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const postId = parseInt((await params).postId, 10);
  if (Number.isNaN(postId)) return NextResponse.json({ error: '无效的 id' }, { status: 400 });

  const fav = await prisma.postFavorite.findUnique({
    where: { userId_postId: { userId: uid, postId } },
  });
  if (!fav) return NextResponse.json({ error: '未收藏' }, { status: 404 });

  const data = await req.json();
  const update: Record<string, unknown> = {};

  if (data.note !== undefined) {
    update.note = data.note === '' ? null : String(data.note).trim().slice(0, 500);
  }
  if (data.sortOrder !== undefined) {
    update.sortOrder = parseInt(data.sortOrder, 10) || 0;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '没有要更新的字段' }, { status: 400 });
  }

  await prisma.postFavorite.update({
    where: { userId_postId: { userId: uid, postId } },
    data: update,
  });

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/favorites/[postId] —— 取消收藏
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const postId = parseInt((await params).postId, 10);
  if (Number.isNaN(postId)) return NextResponse.json({ error: '无效的 id' }, { status: 400 });

  await prisma.postFavorite.deleteMany({
    where: { userId: uid, postId },
  });
  trackActivity({
    type: ACTIVITY_EVENT.FAVORITE_REMOVE,
    userId: uid,
    entityType: 'post',
    entityId: postId,
    source: 'web',
  });

  return NextResponse.json({ ok: true });
}
