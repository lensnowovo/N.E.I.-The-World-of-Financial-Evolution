import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUid } from '@/lib/session';
import { taskBundles } from '@/lib/bundles';
import { fetchBundleStepCards } from '@/lib/bundle-posts';

export const dynamic = 'force-dynamic';

/**
 * POST /api/bundles/favorite-all
 * Body: { slug: string }
 * 一键收藏整个 bundle 的所有 Skill。
 */
export async function POST(req: Request) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const { slug } = await req.json();
  const bundle = taskBundles.find((b) => b.slug === slug);
  if (!bundle) return NextResponse.json({ error: 'Bundle 不存在' }, { status: 404 });

  // 获取这个 bundle 关联的所有 postId
  const stepCards = await fetchBundleStepCards(bundle, uid);
  const allPostIds = new Set<number>();
  for (const step of stepCards) {
    for (const item of step.items) {
      allPostIds.add(item.id);
    }
  }

  if (allPostIds.size === 0) {
    return NextResponse.json({ added: 0, message: '没有可收藏的 Skill' });
  }

  // 批量 upsert 收藏
  let added = 0;
  for (const postId of allPostIds) {
    try {
      await prisma.postFavorite.upsert({
        where: { userId_postId: { userId: uid, postId } },
        create: { userId: uid, postId },
        update: {},
      });
      added++;
    } catch {
      // skip
    }
  }

  return NextResponse.json({ added, total: allPostIds.size, message: `已收藏 ${added} 个 Skill` });
}
