import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUid } from '@/lib/session';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  const commentId = parseInt((await params).id, 10);

  const exist = await prisma.commentLike.findUnique({
    where: { userId_commentId: { userId: uid, commentId } },
  });
  if (exist) {
    await prisma.commentLike.delete({ where: { id: exist.id } });
    await prisma.comment.update({ where: { id: commentId }, data: { likeCount: { decrement: 1 } } });
    return NextResponse.json({ liked: false });
  }
  try {
    await prisma.commentLike.create({ data: { userId: uid, commentId } });
    await prisma.comment.update({ where: { id: commentId }, data: { likeCount: { increment: 1 } } });
  } catch {
    /* ignore */
  }
  return NextResponse.json({ liked: true });
}
