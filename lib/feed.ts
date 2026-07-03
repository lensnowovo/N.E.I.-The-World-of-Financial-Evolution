import { prisma } from '@/lib/db';
import { stripHtml } from '@/lib/validate';
import { POST_STATUS } from '@/lib/status';
import { normalizePublicText } from '@/lib/public-url';
import { analyzeSkillQuality } from '@/lib/skill-quality';
import { buildSkillDisplay } from '@/lib/skill-display';
import {
  SCENE_TAGS,
  INDUSTRY_TAGS,
  CONTENT_TAGS,
  SKILL_TAGS,
  sceneLabel,
  industryLabel,
  contentLabel,
  skillLabel,
} from '@/lib/tags';
import type { PostCardData } from '@/lib/types';

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
  mcp?: string;
  attachment?: string;
  featured?: string;
  contentList?: string[];
  limit?: number;
  page?: number;
  pageSize?: number;
  sort?: 'latest' | 'popular' | 'relevance';
};

/**
 * 构建 Prisma where 子句（共用）
 */
export function buildFeedWhere(query: Pick<FeedQuery, 'scene' | 'industry' | 'skill' | 'role' | 'time' | 'mcp' | 'attachment' | 'featured'>) {
  const { scene, industry, skill, role, time, mcp, attachment, featured } = query;
  const where: any = { status: POST_STATUS.PUBLISHED, deletedAt: null };
  const and: any[] = [];
  if (scene && sceneVals.includes(scene)) where.tagScene = scene;
  if (industry && industryVals.includes(industry)) where.tagIndustry = industry;
  if (skill && skillVals.includes(skill)) {
    and.push({ OR: [{ tagSkill: skill }, { skillAsset: { is: { assetType: skill } } }] });
  }
  // Keep role parsing for old links, but the main discovery UI no longer exposes it.
  if (role && ['VC', 'PE', 'FA'].includes(role)) where.author = { role };
  if (mcp === 'ready') where.mcpApproved = true;
  if (featured === '1') where.featured = true;
  if (attachment === '1') and.push({ attachments: { some: {} } });
  if (time) {
    const days = time === '7d' ? 7 : time === '30d' ? 30 : time === '90d' ? 90 : 0;
    if (days > 0) where.createdAt = { gte: new Date(Date.now() - days * 86400000) };
  }
  if (and.length > 0) where.AND = and;
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
export function normalizeSort(v: unknown, hasQuery = false): 'latest' | 'popular' | 'relevance' {
  if (v === 'latest' || v === 'popular' || v === 'relevance') return v;
  return hasQuery ? 'relevance' : 'popular';
}

/**
 * 内存排序（fetchFeed 和 api/posts GET 共用，防止 SSR/API 排序逻辑漂移）。
 *
 * 入参 posts 是 Prisma findMany 的原始结果（含 viewCount 和 _count）。
 * - latest：按 createdAt desc
 * - popular：按收藏量优先排序；收藏量相同时，再用浏览/评论和时间兜底。
 *   （冷启动期全 0 时自然退化成最新排序，是设计内兜底）
 *
 * TODO: 数据量 > 100 后考虑改 SQL 层排序（Prisma _count 只能单维，届时需冗余字段或 raw SQL）。
 */
export function sortPosts(posts: any[], sort: 'latest' | 'popular' | 'relevance', q = ''): any[] {
  const scored = q.trim()
    ? posts
        .map((post) => ({ post, relevance: scorePost(post, q) }))
        .filter((item) => item.relevance > 0)
    : posts.map((post) => ({ post, relevance: 0 }));

  const score = (p: any) =>
    (p.viewCount || 0) + (p._count?.stars || 0) * 5 + (p._count?.comments || 0) * 3;
  return scored.sort((aItem, bItem) => {
    const a = aItem.post;
    const b = bItem.post;
    if (sort === 'relevance' && q.trim()) {
      const diff = bItem.relevance - aItem.relevance;
      if (diff !== 0) return diff;
      const hot = score(b) - score(a);
      if (hot !== 0) return hot;
      return b.createdAt.getTime() - a.createdAt.getTime();
    }
    if (sort === 'latest') {
      return b.createdAt.getTime() - a.createdAt.getTime();
    }
    const starDiff = (b._count?.stars || 0) - (a._count?.stars || 0);
    if (starDiff !== 0) return starDiff;
    const engagementDiff =
      ((b.viewCount || 0) + (b._count?.comments || 0) * 3) -
      ((a.viewCount || 0) + (a._count?.comments || 0) * 3);
    if (engagementDiff !== 0) return engagementDiff;
    return b.createdAt.getTime() - a.createdAt.getTime();
  }).map((item) => item.post);
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
  const mcp = typeof searchParams.mcp === 'string' ? searchParams.mcp : undefined;
  const attachment = typeof searchParams.attachment === 'string' ? searchParams.attachment : undefined;
  const featured = typeof searchParams.featured === 'string' ? searchParams.featured : undefined;
  const contentList = Array.isArray(searchParams.content)
    ? searchParams.content
    : typeof searchParams.content === 'string'
    ? [searchParams.content]
    : [];
  const sort = normalizeSort(searchParams.sort, !!q);
  return { scene, industry, skill, role, time, q, mcp, attachment, featured, contentList, sort };
}

/**
 * fetchFeed —— 首页 / 搜索 / 筛选 共用的数据查询
 * 返回 PostCardData[] 已带 liked / favorited 状态
 */
export async function fetchFeed(query: FeedQuery, uid: number | null): Promise<PostCardData[]> {
  const { items } = await fetchFeedPage({ ...query, page: 1, pageSize: query.limit ?? 50 }, uid);
  return items;
}

export async function fetchFeedPage(
  query: FeedQuery,
  uid: number | null,
): Promise<{ items: PostCardData[]; page: number; pageSize: number; hasMore: boolean; total: number }> {
  const { contentList = [], sort = 'popular', q = '' } = query;
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, query.pageSize ?? query.limit ?? 20));

  const where = buildFeedWhere(query);

  let posts = await prisma.post.findMany({
    where,
    include: {
      author: { select: { id: true, nickname: true, role: true, avatarUrl: true } },
      _count: { select: { comments: true, stars: true, attachments: true } },
      skillAsset: { select: { id: true, assetType: true, originalAuthor: true, sourceUrl: true, installHint: true, usageNotes: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  posts = filterByContent(posts, contentList);
  posts = sortPosts(posts, sort, q);

  const total = posts.length;
  const start = (page - 1) * pageSize;
  const pagePosts = posts.slice(start, start + pageSize);
  const hasMore = start + pageSize < total;

  const { starredIds } = await fetchUserStars(uid, pagePosts.map((p) => p.id));

  return {
    items: pagePosts.map((post) => mapPostToCardData(post, starredIds.has(post.id))),
    page,
    pageSize,
    hasMore,
    total,
  };
}

export function hasAnyFilter(q: FeedQuery): boolean {
  return !!(q.scene || q.industry || q.skill || q.role || q.time || q.contentList?.length || q.q || q.mcp || q.attachment || q.featured);
}

export function mapPostToCardData(p: any, starred: boolean): PostCardData {
  const tagContent = safeJsonArray(p.tagContent);
  const assetType = p.skillAsset?.assetType ?? p.tagSkill ?? null;
  const quality = analyzeSkillQuality({
    title: p.title,
    body: p.body,
    tagScene: p.tagScene,
    tagContent,
    tagSkill: p.tagSkill,
    assetType,
    attachmentsCount: p._count.attachments,
    sourceUrl: p.skillAsset?.sourceUrl ?? null,
    installHint: p.skillAsset?.installHint ?? null,
    usageNotes: p.skillAsset?.usageNotes ?? null,
  });
  const display = buildSkillDisplay({
    title: p.title,
    body: p.body,
    tagScene: p.tagScene,
    tagIndustry: p.tagIndustry,
    tagContent,
    tagSkill: p.tagSkill,
    assetType,
    usageNotes: p.skillAsset?.usageNotes ?? null,
    outputExample: quality.outputExample,
  });

  return {
    id: p.id,
    title: p.title,
    displayTitle: display.displayTitle,
    excerpt: display.displaySummary,
    tagScene: p.tagScene,
    tagIndustry: p.tagIndustry,
    tagContent,
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
    starred,
    mcpApproved: p.mcpApproved,
    featured: p.featured,
    assetType,
    displaySummary: display.displaySummary,
    displayUseCase: display.displayUseCase,
    displayOutput: display.displayOutput,
    displaySteps: display.displaySteps,
    displayTags: display.displayTags,
    inputExample: quality.inputExample,
    outputExample: quality.outputExample,
    usageBoundary: getUsageBoundary({
      assetType,
      securityLevel: p.securityLevel,
      mcpApproved: p.mcpApproved,
    }),
    skillAsset: p.skillAsset
      ? { id: p.skillAsset.id, assetType: p.skillAsset.assetType, originalAuthor: p.skillAsset.originalAuthor }
      : null,
  };
}

function scorePost(post: any, q: string) {
  const tagContent = safeJsonArray(post.tagContent);
  const assetType = post.skillAsset?.assetType ?? post.tagSkill ?? '';
  const fields: Array<[number, string]> = [
    [90, post.title],
    [55, `${sceneLabel(post.tagScene)} ${post.tagScene}`],
    [50, `${skillLabel(assetType)} ${assetType}`],
    [45, `${post.tagIndustry ? industryLabel(post.tagIndustry) : ''} ${post.tagIndustry ?? ''}`],
    [42, tagContent.map((tag) => `${contentLabel(tag)} ${tag}`).join(' ')],
    [24, stripHtml(normalizePublicText(post.body))],
    [12, `${post.author?.nickname ?? ''} ${post.skillAsset?.originalAuthor ?? ''}`],
  ];
  const tokens = tokenizeQuery(q);
  let score = 0;
  for (const [weight, raw] of fields) {
    const text = normalizeSearchText(raw);
    for (const token of tokens) {
      if (text.includes(token)) score += weight;
    }
  }
  return score;
}

function buildCardSummary(html: string) {
  const text = stripHtml(normalizePublicText(html))
    .replace(/\s+/g, ' ')
    .replace(/^#+\s*/, '')
    .trim();
  if (text.length <= 220) return text;

  const sentenceEnd = text.slice(0, 260).search(/[。.!?！？]/);
  if (sentenceEnd >= 60) return text.slice(0, sentenceEnd + 1);

  const softBreak = text.slice(150, 220).search(/[，,；;、]/);
  if (softBreak >= 0) return `${text.slice(0, 150 + softBreak)}...`;

  return `${text.slice(0, 210)}...`;
}

function tokenizeQuery(q: string) {
  const normalized = normalizeSearchText(q);
  const parts = normalized.split(/\s+/).filter(Boolean);
  return Array.from(new Set([normalized, ...parts].filter((part) => part.length > 0)));
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[，。、《》“”'"`~!@#$%^&*()[\]{}:;|\\/?+=_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function safeJsonArray(raw: string | null): string[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function getUsageBoundary({
  assetType,
  securityLevel,
  mcpApproved,
}: {
  assetType: string | null;
  securityLevel: string;
  mcpApproved: boolean;
}) {
  if (securityLevel !== 'safe') return '该内容仍需复核，建议先在非敏感材料中试用。';
  if (!mcpApproved) return '可在网页阅读、复制或下载；进入 MCP 前仍需审核确认。';
  if (assetType === 'api-script') return '运行脚本前请在隔离环境检查代码、依赖和环境变量。';
  if (assetType === 'template') return '模板适合脱敏后复用，正式材料仍需人工校对。';
  return '适合处理已脱敏或可公开讨论的工作材料；最终判断仍由使用者负责。';
}
