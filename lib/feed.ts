import { prisma } from '@/lib/db';
import { stripHtml } from '@/lib/validate';
import { POST_STATUS } from '@/lib/status';
import {
  SCENE_TAGS,
  INDUSTRY_TAGS,
  CONTENT_TAGS,
  SKILL_TAGS,
} from '@/lib/tags';
import type { PostCardData } from '@/components/PostCard';

const sceneVals: string[] = SCENE_TAGS.map((t) => t.value);
const industryVals: string[] = INDUSTRY_TAGS.map((t) => t.value);
const contentVals: string[] = CONTENT_TAGS.map((t) => t.value);
const skillVals: string[] = SKILL_TAGS.map((t) => t.value);

export type FeedQuery = {
  scene?: string;
  industry?: string;
  skill?: string;
  role?: string;
  time?: string;
  q?: string;
  contentList?: string[];
  limit?: number;
  sort?: 'latest' | 'popular';
};

/**
 * 构建 Prisma where 子句（共用）
 */
export function buildFeedWhere(query: Pick<FeedQuery, 'scene' | 'industry' | 'skill' | 'role' | 'time' | 'q'>) {
  const { scene, industry, skill, role, time, q } = query;
  const where: any = { status: POST_STATUS.PUBLISHED };
  if (scene && sceneVals.includes(scene)) where.tagScene = scene;
  if (industry && industryVals.includes(industry)) where.tagIndustry = industry;
  if (skill && skillVals.includes(skill)) where.tagSkill = skill;
  if (role && ['VC', 'PE', 'FA'].includes(role)) where.author = { role };
  if (time) {
    const days = time === '7d' ? 7 : time === '30d' ? 30 : time === '90d' ? 90 : 0;
    if (days > 0) where.createdAt = { gte: new Date(Date.now() - days * 86400000) };
  }
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { body: { contains: q } },
      { author: { nickname: { contains: q } } },
    ];
  }
  return where;
}

/**
 * 获取当前用户对一批 post 的 liked / favorited 状态（共用）
 */
export async function fetchUserStars(uid: number | null, postIds: number[]) {
  if (!uid || postIds.length === 0) {
    return { starredIds: new Set<number>() };
  }
  const stars = await prisma.postFavorite.findMany({
    where: { userId: uid, postId: { in: postIds } },
    select: { postId: true },
  });
  return { starredIds: new Set(stars.map((s) => s.postId)) };
}

/**
 * 内存过滤 tagContent 多选（共用）
 */
export function filterByContent(posts: any[], contentList: string[]) {
  if (contentList.length === 0) return posts;
  const v = contentList.filter((c) => contentVals.includes(c));
  if (v.length === 0) return posts;
  return posts.filter((p) => {
    try {
      const arr = JSON.parse(p.tagContent || '[]') as string[];
      return v.every((x) => arr.includes(x));
    } catch {
      return false;
    }
  });
}

/**
 * 把白名单外的 sort 值归一为 'popular'，防注入 / 防脏值。
 */
export function normalizeSort(v: unknown): 'latest' | 'popular' {
  return v === 'latest' ? 'latest' : 'popular';
}

/**
 * 内存排序（fetchFeed 和 api/posts GET 共用，防止 SSR/API 排序逻辑漂移）。
 *
 * 入参 posts 是 Prisma findMany 的原始结果（含 viewCount 和 _count）。
 * - latest：按 createdAt desc
 * - popular：加权分数 score = viewCount*1 + likes*5 + comments*3，tiebreaker = createdAt desc
 *   （冷启动期全 0 时自然退化成最新排序，是设计内兜底）
 *
 * TODO: 数据量 > 100 后考虑改 SQL 层排序（Prisma _count 只能单维，届时需冗余字段或 raw SQL）。
 */
export function sortPosts(posts: any[], sort: 'latest' | 'popular'): any[] {
  const score = (p: any) =>
    (p.viewCount || 0) + (p._count?.stars || 0) * 5 + (p._count?.comments || 0) * 3;
  return posts.sort((a, b) => {
    if (sort === 'latest') {
      return b.createdAt.getTime() - a.createdAt.getTime();
    }
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

/**
 * 从 URL searchParams 提取 FeedQuery
 */
export function parseFeedQuery(searchParams: { [k: string]: string | string[] | undefined }): FeedQuery {
  const scene = typeof searchParams.scene === 'string' ? searchParams.scene : undefined;
  const industry = typeof searchParams.industry === 'string' ? searchParams.industry : undefined;
  const skill = typeof searchParams.skill === 'string' ? searchParams.skill : undefined;
  const role = typeof searchParams.role === 'string' ? searchParams.role : undefined;
  const time = typeof searchParams.time === 'string' ? searchParams.time : undefined;
  const q = typeof searchParams.q === 'string' ? searchParams.q.trim() : '';
  const contentList = Array.isArray(searchParams.content)
    ? searchParams.content
    : typeof searchParams.content === 'string'
    ? [searchParams.content]
    : [];
  const sort = normalizeSort(searchParams.sort);
  return { scene, industry, skill, role, time, q, contentList, sort };
}

/**
 * fetchFeed —— 首页 / 搜索 / 筛选 共用的数据查询
 * 返回 PostCardData[] 已带 liked / favorited 状态
 */
export async function fetchFeed(query: FeedQuery, uid: number | null): Promise<PostCardData[]> {
  const { contentList = [], limit = 50, sort = 'popular' } = query;

  const where = buildFeedWhere(query);

  let posts = await prisma.post.findMany({
    where,
    include: {
      author: { select: { id: true, nickname: true, role: true, avatarUrl: true } },
      _count: { select: { comments: true, stars: true, attachments: true } },
      skillAsset: { select: { id: true, assetType: true, originalAuthor: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  posts = filterByContent(posts, contentList);
  posts = sortPosts(posts, sort);

  const { starredIds } = await fetchUserStars(uid, posts.map((p) => p.id));

  return posts.map((p) => ({
    id: p.id,
    title: p.title,
    excerpt: stripHtml(p.body).slice(0, 160),
    tagScene: p.tagScene,
    tagIndustry: p.tagIndustry,
    tagContent: (() => {
      try {
        return JSON.parse(p.tagContent || '[]') as string[];
      } catch {
        return [];
      }
    })(),
    tagSkill: p.tagSkill,
    createdAt: p.createdAt.toISOString(),
    author: {
      id: p.author.id,
      nickname: p.author.nickname,
      role: p.author.role,
      avatarUrl: p.author.avatarUrl,
    },
    counts: {
      comments: p._count.comments,
      stars: p._count.stars,
      attachments: p._count.attachments,
    },
    viewCount: p.viewCount,
    starred: starredIds.has(p.id),
    skillAsset: p.skillAsset
      ? { id: p.skillAsset.id, assetType: p.skillAsset.assetType, originalAuthor: p.skillAsset.originalAuthor }
      : null,
  }));
}

export function hasAnyFilter(q: FeedQuery): boolean {
  return !!(q.scene || q.industry || q.skill || q.role || q.time || q.contentList?.length || q.q);
}
