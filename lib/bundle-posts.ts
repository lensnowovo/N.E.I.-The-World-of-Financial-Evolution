import { prisma } from '@/lib/db';
import { POST_STATUS } from '@/lib/status';
import { stripHtml } from '@/lib/validate';
import { fetchUserStars, mapPostToCardData } from '@/lib/feed';
import type { TaskBundle } from '@/lib/bundles';
import type { BundleStepCards } from '@/components/home/HomeBundleTimeline';

export async function fetchBundleStepCards(
  bundle: TaskBundle,
  uid: number | null,
): Promise<BundleStepCards[]> {
  const posts = await prisma.post.findMany({
    where: {
      status: POST_STATUS.PUBLISHED,
      deletedAt: null,
      tagScene: { in: bundle.scenes },
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
    orderBy: { createdAt: 'desc' },
    take: 120,
  });

  const selections = new Map<string, number[]>();
  const usedIds = new Set<number>();
  const selectedIds: number[] = [];

  for (const step of bundle.steps) {
    const matches = posts
      .filter((post) => !usedIds.has(post.id))
      .map((post) => ({ post, score: scoreBundlePost(post, step.skillQueries) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.post.id);

    matches.forEach((id) => {
      usedIds.add(id);
      selectedIds.push(id);
    });
    selections.set(step.title, matches);
  }

  const { starredIds } = await fetchUserStars(uid, selectedIds);
  const cardById = new Map(
    posts
      .filter((post) => selectedIds.includes(post.id))
      .map((post) => [post.id, mapPostToCardData(post, starredIds.has(post.id))]),
  );

  return bundle.steps.map((step) => ({
    stepTitle: step.title,
    items: (selections.get(step.title) || [])
      .map((id) => cardById.get(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
  }));
}

function scoreBundlePost(post: any, keywords: string[]) {
  const tagContent = safeJsonArray(post.tagContent).join(' ');
  const text = [
    post.title,
    stripHtml(post.body),
    post.tagScene,
    post.tagIndustry,
    post.tagSkill,
    post.skillAsset?.assetType,
    post.skillAsset?.originalAuthor,
    tagContent,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return keywords.reduce((score, keyword) => {
    const token = keyword.toLowerCase();
    if (!token) return score;
    if (String(post.title).toLowerCase().includes(token)) return score + 8;
    return text.includes(token) ? score + 3 : score;
  }, 0);
}

function safeJsonArray(raw: string | null): string[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}
