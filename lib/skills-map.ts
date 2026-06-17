import { prisma } from '@/lib/db';
import { POST_STATUS } from '@/lib/status';
import { SCENE_TAGS, SKILL_TAGS } from '@/lib/tags';

export type SkillsMapCell = {
  scene: string;
  assetType: string;
  count: number;
  featured: {
    id: number;
    title: string;
    author: { nickname: string; role: string };
  } | null;
};

export type SkillsMapStats = {
  totalAssets: number;
  activeScenes: number;
  topAssetType: { value: string; label: string; count: number } | null;
};

export async function getSkillsMap() {
  const posts = await prisma.post.findMany({
    where: { status: POST_STATUS.PUBLISHED, skillAsset: { isNot: null } },
    include: {
      author: { select: { id: true, nickname: true, role: true, avatarUrl: true } },
      skillAsset: true,
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  const grouped = new Map<string, typeof posts>();
  const activeSceneValues = new Set<string>();
  const assetTypeCounts = new Map<string, number>();

  for (const post of posts) {
    if (!post.skillAsset || !post.tagScene) continue;
    activeSceneValues.add(post.tagScene);
    const at = post.skillAsset.assetType;
    assetTypeCounts.set(at, (assetTypeCounts.get(at) ?? 0) + 1);
    const key = `${post.tagScene}::${at}`;
    grouped.set(key, [...(grouped.get(key) ?? []), post]);
  }

  const cells: SkillsMapCell[] = [];
  for (const scene of SCENE_TAGS) {
    for (const skill of SKILL_TAGS) {
      const key = `${scene.value}::${skill.value}`;
      const items = grouped.get(key) ?? [];
      const featured = items[0];
      cells.push({
        scene: scene.value,
        assetType: skill.value,
        count: items.length,
        featured: featured
          ? { id: featured.id, title: featured.title, author: { nickname: featured.author.nickname, role: featured.author.role } }
          : null,
      });
    }
  }

  let topAssetType: SkillsMapStats['topAssetType'] = null;
  for (const [value, count] of assetTypeCounts) {
    if (!topAssetType || count > topAssetType.count) {
      const tag = SKILL_TAGS.find((s) => s.value === value);
      topAssetType = { value, label: tag?.label ?? value, count };
    }
  }

  return {
    cells,
    stats: { totalAssets: posts.length, activeScenes: activeSceneValues.size, topAssetType },
  };
}
