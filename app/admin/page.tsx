export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { POST_STATUS } from '@/lib/status';
import {
  AdminConsoleClient,
  type AdminPostItem,
  type ReviewPostItem,
  type OverviewStats,
  type McpStats,
  type ReportItem,
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

  // 待审队列：status=pending（含 SEC-006 reject 档）或 reviewFlag 非空（含 suspicious 标记）
  // 两类都需管理员复核；SEC-007 的 approve 动作清 reviewFlag + mcpApproved=true
  const reviewSelect = {
    ...postSelect,
    mcpApproved: true,
    reviewFlag: true,
    securityLevel: true,
    version: true,
  } as const;

  const [
    rows, myRows, reviewRows, reportRows,
    [totalPosts, totalUsers, totalMcpCalls, featuredCount],
    [todayPosts, todayUsers, todayMcp],
    mcpByTool, mcpRecent, tokenUsers,
  ] = await Promise.all([
    prisma.post.findMany({ select: postSelect, orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.post.findMany({ where: { userId: me.id }, select: postSelect, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.post.findMany({
      where: { deletedAt: null, OR: [{ status: POST_STATUS.PENDING }, { reviewFlag: { not: null } }] },
      select: reviewSelect,
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    // SEC-011: open 状态举报，按时间倒序，take 100；含 reporter nickname + post title 便于处置
    prisma.report.findMany({
      where: { status: 'open' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        reason: true,
        status: true,
        createdAt: true,
        reporter: { select: { id: true, nickname: true } },
        post: { select: { id: true, title: true, status: true, deletedAt: true, author: { select: { id: true, nickname: true } } } },
      },
    }),
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

  const reviewItems: ReviewPostItem[] = reviewRows.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    tagScene: r.tagScene,
    mcpApproved: r.mcpApproved,
    reviewFlag: r.reviewFlag,
    securityLevel: r.securityLevel,
    version: r.version,
    createdAt: r.createdAt.toISOString(),
    author: { id: r.author.id, nickname: r.author.nickname },
  }));

  const reportItems: ReportItem[] = reportRows.map((r) => ({
    id: r.id,
    reason: r.reason,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    reporter: { id: r.reporter.id, nickname: r.reporter.nickname },
    post: {
      id: r.post.id,
      title: r.post.title,
      status: r.post.status,
      deletedAt: r.post.deletedAt?.toISOString() ?? null,
      author: { id: r.post.author.id, nickname: r.post.author.nickname },
    },
  }));

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
            {reviewItems.length > 0 && <span className="text-wax-red"> · {reviewItems.length} 待审</span>}
            {reportItems.length > 0 && <span className="text-wax-red"> · {reportItems.length} 举报</span>}
          </span>
        </div>
        <p className="mt-2 font-sans text-xs text-leather">
          内容审核 · 精选排序 · MCP 状态 · 数据监控
        </p>
      </div>

      <AdminConsoleClient
        initialItems={items}
        myPosts={myPosts}
        initialReviewItems={reviewItems}
        initialReportItems={reportItems}
        overview={overview}
        mcp={mcp}
        adminId={me.id}
      />
    </div>
  );
}
