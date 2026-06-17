import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUid } from '@/lib/session';

// 评论作者可删除自己评论；内容作者可删除其帖子下所有评论
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  const id = parseInt(params.id, 10);

  const c = await prisma.comment.findUnique({
    where: { id },
    include: { post: { select: { userId: true } } },
  });
  if (!c) return NextResponse.json({ error: '评论不存在' }, { status: 404 });

  if (c.userId !== uid && c.post.userId !== uid) {
    return NextResponse.json({ error: '无权限删除' }, { status: 403 });
  }

  // 连同子回复一起删除
  const repliesCount = await prisma.comment.count({ where: { parentId: id } });
  await prisma.comment.deleteMany({ where: { parentId: id } });
  await prisma.comment.delete({ where: { id } });
  await prisma.post.update({
    where: { id: c.postId },
    data: { commentCount: { decrement: 1 + repliesCount } },
  });

  return NextResponse.json({ ok: true });
}
