import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUid } from '@/lib/session';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  const postId = parseInt((await params).id, 10);
  if (Number.isNaN(postId)) return NextResponse.json({ error: '参数错误' }, { status: 400 });

  const exist = await prisma.postFavorite.findUnique({
    where: { userId_postId: { userId: uid, postId } },
  });
  if (exist) {
    await prisma.postFavorite.delete({ where: { id: exist.id } });
    return NextResponse.json({ favorited: false });
  }
  try {
    // 新收藏排在最后（sortOrder = 当前收藏数）
    const count = await prisma.postFavorite.count({ where: { userId: uid } });
    await prisma.postFavorite.create({ data: { userId: uid, postId, sortOrder: count } });
  } catch {
    /* race; ignore */
  }
  return NextResponse.json({ favorited: true });
}
