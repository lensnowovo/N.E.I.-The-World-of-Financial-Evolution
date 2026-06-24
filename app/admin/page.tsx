export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import {
  AdminConsoleClient,
  type AdminPostItem,
  type OverviewStats,
  type McpStats,
} from './AdminConsoleClient';

// /admin —— 管理员控制台（多 tab：概览 / 内容审核 / MCP 状态 / 我的发布 / 数据）
export default async function AdminPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/admin');
  if (!me.isAdmin) redirect('/?error=forbidden');

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  const postSelect = {
    id: true,
    title: true,
    status: true,
    tagScene: true,
    featured: true,
    featuredOrder: true,
    deletedAt: true,
    createdAt: true,
    author: { select: { id: true, nickname: true } },
  } as const;

  const [
    rows, myRows,
    [totalPosts, totalUsers, totalMcpCalls, featuredCount],
    [todayPosts, todayUsers, todayMcp],
    mcpByTool, mcpRecent, tokenUsers,
  ] = await Promise.all([
    prisma.post.findMany({ select: postSelect, orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.post.findMany({ where: { userId: me.id }, select: postSelect, orderBy: { createdAt: 'desc' }, take: 50 }),
    Promise.all([
      prisma.post.count({ where: { deletedAt: null } }),
      prisma.user.count(),
      prisma.mcpCallLog.count(),
      prisma.post.count({ where: { featured: true, deletedAt: null } }),
    ]),
    Promise.all([
      prisma.post.count({ where: { createdAt: { gte: todayStart }, deletedAt: null } }),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.mcpCallLog.count({ where: { createdAt: { gte: todayStart } } }),
    ]),
    prisma.mcpCallLog.groupBy({ by: ['tool'], _count: true, orderBy: { _count: { tool: 'desc' } }, take: 10 }),
    prisma.mcpCallLog.findMany({
      orderBy: { createdAt: 'desc' }, take: 12,
      select: { tool: true, postId: true, createdAt: true, user: { select: { nickname: true } } },
    }),
    prisma.user.count({ where: { mcpTokenHash: { not: null } } }),
  ]);

  const mapItem = (r: typeof rows[number]): AdminPostItem => ({
    id: r.id,
    title: r.title,
    status: r.status,
    tagScene: r.tagScene,
    featured: r.featured,
    featuredOrder: r.featuredOrder,
    deletedAt: r.deletedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    author: { id: r.author.id, nickname: r.author.nickname },
  });

  const items: AdminPostItem[] = rows.map(mapItem);
  const myPosts: AdminPostItem[] = myRows.map(mapItem);

  const overview: OverviewStats = {
    totalPosts, totalUsers, totalMcpCalls, featuredCount,
    todayPosts, todayUsers, todayMcp,
  };

  const mcp: McpStats = {
    tokenUsers,
    byTool: mcpByTool.map((t) => ({ tool: t.tool, count: t._count })),
    recent: mcpRecent.map((r) => ({
      tool: r.tool,
      postId: r.postId,
      nickname: r.user?.nickname ?? '未知',
      createdAt: r.createdAt.toISOString(),
    })),
  };

  const activeCount = items.filter((i) => !i.deletedAt).length;
  const deletedCount = items.length - activeCount;

  return (
    <div className="mx-auto max-w-page px-4 sm:px-6 py-8">
      <div className="mb-6 pb-5 border-b border-paper-edge">
        <Link href="/" className="inline-flex items-center gap-1.5 font-serif italic text-sm text-sepia hover:text-ink-brown mb-3">
          ← 返回首页
        </Link>
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="font-serif text-3xl text-ink-brown">管理员控制台</h1>
          <span className="font-mono text-sm text-sepia">
            {activeCount} 活跃 · {deletedCount} 已软删 · {overview.featuredCount} 精选
          </span>
        </div>
        <p className="mt-2 font-sans text-xs text-leather">
          内容审核 · 精选排序 · MCP 状态 · 数据监控
        </p>
      </div>

      <AdminConsoleClient
        initialItems={items}
        myPosts={myPosts}
        overview={overview}
        mcp={mcp}
        adminId={me.id}
      />
    </div>
  );
}
