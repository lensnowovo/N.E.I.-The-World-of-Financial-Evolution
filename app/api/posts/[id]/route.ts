import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUid } from '@/lib/session';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: '参数错误' }, { status: 400 });

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, nickname: true, role: true, avatarUrl: true } },
      attachments: true,
      _count: { select: { comments: true, likes: true } },
    },
  });
  if (!post || post.status !== 'published') {
    return NextResponse.json({ error: '内容不存在或未发布' }, { status: 404 });
  }

  await prisma.post.update({ where: { id }, data: { viewCount: { increment: 1 } } });

  const uid = await getSessionUid();
  let liked = false;
  let favorited = false;
  if (uid) {
    const [l, f] = await Promise.all([
      prisma.postLike.findUnique({ where: { userId_postId: { userId: uid, postId: id } } }),
      prisma.postFavorite.findUnique({ where: { userId_postId: { userId: uid, postId: id } } }),
    ]);
    liked = !!l;
    favorited = !!f;
  }

  return NextResponse.json({
    ...post,
    tagContent: JSON.parse(post.tagContent || '[]'),
    liked,
    favorited,
  });
}
