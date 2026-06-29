import { prisma } from '@/lib/db';
import { POST_STATUS } from '@/lib/status';
import { fetchUserStars, mapPostToCardData } from '@/lib/feed';
import type { TaskBundle } from '@/lib/bundles';
import type { BundleStepCards } from '@/components/home/HomeBundleTimeline';

/**
 * 根据 bundle.steps[].postIds 精确查询 Skill 卡片。
 * 不再使用关键词模糊匹配——每个步骤的 postId 是手动指定的，确保 100% 准确。
 */
export async function fetchBundleStepCards(
  bundle: TaskBundle,
  uid: number | null,
): Promise<BundleStepCards[]> {
  const allPostIds = bundle.steps.flatMap((step) => step.postIds);

  if (allPostIds.length === 0) {
    return bundle.steps.map((step) => ({ stepTitle: step.title, items: [] }));
  }

  const posts = await prisma.post.findMany({
    where: {
      id: { in: allPostIds },
      status: POST_STATUS.PUBLISHED,
      deletedAt: null,
    },
    include: {
      author: { select: { id: true, nickname: true, role: true, avatarUrl: true } },
      _count: { select: { comments: true, stars: true, attachments: true } },
      skillAsset: {
        select: {
          id: true,
          assetType: true,
          originalAuthor: true,
          sourceUrl: true,
          installHint: true,
          usageNotes: true,
        },
      },
    },
  });

  const { starredIds } = await fetchUserStars(uid, allPostIds);
  const postMap = new Map(posts.map((p) => [p.id, p]));

  return bundle.steps.map((step) => ({
    stepTitle: step.title,
    items: step.postIds
      .map((id) => {
        const post = postMap.get(id);
        if (!post) return null;
        return mapPostToCardData(post, starredIds.has(id));
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
  }));
}
