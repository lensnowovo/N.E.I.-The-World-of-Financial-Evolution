import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { stripHtml } from '@/lib/validate';
import {
  buildFeedWhere,
  filterByContent,
  sortPosts,
  normalizeSort,
} from '@/lib/feed';
import { POST_STATUS } from '@/lib/status';
import type { ApiSkillListItem, PaginatedResponse } from '@/lib/types';

/**
 * GET /api/v1/skills —— 公开只读列表 API
 *
 * 参数（全可选）：
 *   scene, industry, content(多值), skill, role, time, q, sort(latest|popular)
 *   page(默认1), pageSize(默认20, 上限50)
 *
 * 复用 lib/feed.ts 的 where/过滤/排序逻辑，uid 恒 null（公开 API 无用户态）。
 * 响应：{ data: [...], meta: { page, pageSize, hasMore } }
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const scene = url.searchParams.get('scene') || undefined;
  const industry = url.searchParams.get('industry') || undefined;
  const contentList = url.searchParams.getAll('content');
  const skill = url.searchParams.get('skill') || undefined;
  const role = url.searchParams.get('role') || undefined;
  const time = url.searchParams.get('time') || undefined;
  const q = url.searchParams.get('q')?.trim() || '';
  const sort = normalizeSort(url.searchParams.get('sort'));
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));

  const where = buildFeedWhere({ scene, industry, skill, role, time, q });

  // 取 pageSize+1 条，多取的那条用来判断 hasMore（修边界：正好 pageSize 条时不再误报有下一页）
  let posts = await prisma.post.findMany({
    where,
    include: {
      author: { select: { id: true, nickname: true, role: true, avatarUrl: true } },
      _count: { select: { comments: true, likes: true, attachments: true } },
      skillAsset: { select: { id: true, assetType: true, originalAuthor: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize + 1,
  });

  const hasMore = posts.length > pageSize;
  posts = posts.slice(0, pageSize); // 去掉多取的那条

  posts = filterByContent(posts, contentList);
  posts = sortPosts(posts, sort);

  const data: ApiSkillListItem[] = posts.map((p) => ({
    id: p.id,
    title: p.title,
    excerpt: stripHtml(p.body).slice(0, 160),
    tagScene: p.tagScene,
    tagIndustry: p.tagIndustry,
    tagContent: safeJsonArray(p.tagContent),
    tagSkill: p.tagSkill,
    createdAt: p.createdAt.toISOString(),
    viewCount: p.viewCount,
    author: p.author,
    counts: {
      comments: p._count.comments,
      likes: p._count.likes,
      attachments: p._count.attachments,
    },
    skillAsset: p.skillAsset
      ? { id: p.skillAsset.id, assetType: p.skillAsset.assetType, originalAuthor: p.skillAsset.originalAuthor }
      : null,
  }));

  const body: PaginatedResponse<ApiSkillListItem> = {
    data,
    meta: { page, pageSize, hasMore },
  };
  return NextResponse.json(body);
}

function safeJsonArray(raw: string | null): string[] {
  try {
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}
