import { NextResponse } from 'next/server';
import {
  fetchFeedPage,
  normalizeSort,
} from '@/lib/feed';
import { withMetrics } from '@/lib/metrics';
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
export const GET = withMetrics('GET /api/v1/skills', getSkills);

async function getSkills(req: Request) {
  const url = new URL(req.url);
  const scene = url.searchParams.get('scene') || undefined;
  const industry = url.searchParams.get('industry') || undefined;
  const contentList = url.searchParams.getAll('content');
  const skill = url.searchParams.get('skill') || undefined;
  const role = url.searchParams.get('role') || undefined;
  const time = url.searchParams.get('time') || undefined;
  const q = url.searchParams.get('q')?.trim() || '';
  const mcp = url.searchParams.get('mcp') || undefined;
  const attachment = url.searchParams.get('attachment') || undefined;
  const featured = url.searchParams.get('featured') || undefined;
  const sort = normalizeSort(url.searchParams.get('sort'), !!q);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));

  const result = await fetchFeedPage(
    { scene, industry, skill, role, time, q, mcp, attachment, featured, contentList, page, pageSize, sort },
    null,
  );
  const data: ApiSkillListItem[] = result.items;

  const body: PaginatedResponse<ApiSkillListItem> = {
    data,
    meta: { page: result.page, pageSize: result.pageSize, hasMore: result.hasMore },
  };
  return NextResponse.json(body);
}
