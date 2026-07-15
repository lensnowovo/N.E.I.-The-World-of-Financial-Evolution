import { prisma } from '@/lib/db';
import { fetchUserStars, mapPostToCardData, sortPosts } from '@/lib/feed';
import { SKILL_SHELF_GROUPS } from '@/lib/skill-shelf-config';
import { POST_STATUS } from '@/lib/status';
import { INDUSTRY_TAGS, sceneLabel } from '@/lib/tags';
import type { PostCardData } from '@/lib/types';

const SHELF_SIZE = 6;

type ShelfFilter = {
  label: string;
  query: string;
  count: number;
};

export type HomeSkillShelf = {
  value: string;
  mark: string;
  eyebrow: string;
  label: string;
  description: string;
  href: string;
  total: number;
  items: PostCardData[];
  filters: ShelfFilter[];
};

export async function fetchHomeSkillShelves(uid: number | null): Promise<HomeSkillShelf[]> {
  const posts = await prisma.post.findMany({
    where: {
      status: POST_STATUS.PUBLISHED,
      deletedAt: null,
      skillAsset: { isNot: null },
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
    take: 500,
  });

  const popular = sortPosts([...posts], 'popular');
  const latest = sortPosts([...posts], 'latest');
  const popularityRank = new Map(popular.map((post, index) => [post.id, index]));
  const featured = posts
    .filter((post) => post.featured)
    .sort((a, b) => {
      const aOrder = a.featuredOrder > 0 ? a.featuredOrder : Number.MAX_SAFE_INTEGER;
      const bOrder = b.featuredOrder > 0 ? b.featuredOrder : Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (popularityRank.get(a.id) ?? 0) - (popularityRank.get(b.id) ?? 0);
    });

  const featuredItems = featured.slice(0, SHELF_SIZE - 1);
  const featuredIds = new Set(featuredItems.map((post) => post.id));
  const recentAddition = latest.find((post) => post.mcpApproved && !featuredIds.has(post.id));
  const openingItems = recentAddition
    ? [...featuredItems, recentAddition]
    : featured.slice(0, SHELF_SIZE);

  const usedIds = new Set(openingItems.map((post) => post.id));
  const shelfPosts = SKILL_SHELF_GROUPS.map((shelf) => {
    const matching = popular.filter((post) => shelf.scenes.some((scene) => scene === post.tagScene));
    let selected = matching.filter((post) => !usedIds.has(post.id)).slice(0, SHELF_SIZE);

    // A sparse shelf should still stay useful even when one of its best items is also featured.
    if (selected.length < SHELF_SIZE) {
      const selectedIds = new Set(selected.map((post) => post.id));
      selected = [
        ...selected,
        ...matching.filter((post) => !selectedIds.has(post.id)).slice(0, SHELF_SIZE - selected.length),
      ];
    }
    selected.forEach((post) => usedIds.add(post.id));
    return { shelf, matching, selected };
  });

  const selectedPosts = [openingItems, ...shelfPosts.map((entry) => entry.selected)].flat();
  const { starredIds } = await fetchUserStars(uid, selectedPosts.map((post) => post.id));
  const toCards = (items: typeof posts) =>
    items.map((post) => mapPostToCardData(post, starredIds.has(post.id)));

  return [
    {
      value: 'featured',
      mark: '01',
      eyebrow: 'Editor\'s Selection',
      label: '精选与最近值得看',
      description: '先从经过筛选的代表内容和最近更新开始，快速了解当前目录。',
      href: '/?featured=1#skill-library',
      total: featured.length,
      items: toCards(openingItems),
      filters: [
        { label: '精选', query: 'featured=1', count: featured.length },
        {
          label: 'MCP Ready',
          query: 'mcp=ready',
          count: posts.filter((post) => post.mcpApproved).length,
        },
        {
          label: '最近更新',
          query: 'time=30d&sort=latest',
          count: posts.filter((post) => post.createdAt >= new Date(Date.now() - 30 * 86400000)).length,
        },
      ],
    },
    ...shelfPosts.map(({ shelf, matching, selected }) => ({
      value: shelf.value,
      mark: shelf.mark,
      eyebrow: shelf.eyebrow,
      label: shelf.label,
      description: shelf.description,
      href: `/stage/${shelf.value}`,
      total: matching.length,
      items: toCards(selected),
      filters:
        shelf.value === 'industry-research'
          ? INDUSTRY_TAGS.map((industry) => ({
              label: industry.label,
              query: `scene=industry-research&industry=${industry.value}`,
              count: matching.filter((post) => post.tagIndustry === industry.value).length,
            })).filter((industry) => industry.count > 0)
          : shelf.scenes.map((scene) => ({
              label: sceneLabel(scene),
              query: `scene=${scene}`,
              count: matching.filter((post) => post.tagScene === scene).length,
            })),
    })),
  ];
}
