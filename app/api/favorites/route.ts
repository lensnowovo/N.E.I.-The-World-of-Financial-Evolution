import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUid } from '@/lib/session';
import { POST_STATUS } from '@/lib/status';

export const dynamic = 'force-dynamic';

/**
 * GET /api/favorites —— 收藏列表（带 sortOrder + note），按排序返回
 */
export async function GET() {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const favs = await prisma.postFavorite.findMany({
    where: { userId: uid },
    include: {
      post: {
        include: {
          author: { select: { id: true, nickname: true, role: true, avatarUrl: true } },
          skillAsset: { select: { id: true, assetType: true, originalAuthor: true } },
        },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });

  const items = favs
    .filter((f) => f.post.status === POST_STATUS.PUBLISHED)
    .map((f) => ({
      favoriteId: f.id,
      postId: f.postId,
      sortOrder: f.sortOrder,
      note: f.note,
      title: f.post.title,
      tagScene: f.post.tagScene,
      tagSkill: f.post.tagSkill,
      assetType: f.post.skillAsset?.assetType ?? null,
      originalAuthor: f.post.skillAsset?.originalAuthor ?? null,
      author: f.post.author.nickname,
    }));

  return NextResponse.json({ items });
}
