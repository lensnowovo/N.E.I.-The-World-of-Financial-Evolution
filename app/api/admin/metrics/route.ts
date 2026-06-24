import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';
// 聚合多个维度，给一点时间（Neon 冷启动 + 多查询）
export const maxDuration = 30;

/**
 * GET /api/admin/metrics —— 管理员 dashboard 数据聚合
 *
 * 两块：
 *  traffic —— 今日帖/用户/MCP调用/活跃用户 + 14 天趋势 + 热门 Skill（全部来自业务表，真实）
 *  pressure —— Neon 连接数(pg_stat_activity) + DB 探测延迟 + 采样到的 API 响应时间/错误率(MetricSample)
 *
 * pressure 的 DB 查询为 best-effort：pg_stat_activity 在某些 Neon 角色下可能受限，失败不致命。
 */
export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  // —— 时间窗口（统一 UTC 日期，与 Neon 存储一致）——
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const start14 = new Date(todayStart.getTime() - 13 * 86_400_000); // 含今天共 14 天

  // 14 天日期键（YYYY-MM-DD），顺序从旧到新
  const dayKeys: string[] = [];
  for (let i = 13; i >= 0; i--) {
    dayKeys.push(new Date(start14.getTime() + i * 86_400_000).toISOString().slice(0, 10));
  }
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);

  // ============ Traffic ============
  const [
    postsRecent, usersRecent, mcpRecent, commentsRecent,
    totalPosts, totalUsers, totalMcp,
    topSkillsLogs,
  ] = await Promise.all([
    // 最近 14 天帖（含作者，用于趋势 + 今日活跃）
    prisma.post.findMany({
      where: { createdAt: { gte: start14 }, deletedAt: null },
      select: { createdAt: true, userId: true },
    }),
    prisma.user.findMany({ where: { createdAt: { gte: start14 } }, select: { createdAt: true } }),
    prisma.mcpCallLog.findMany({ where: { createdAt: { gte: start14 } }, select: { createdAt: true, userId: true } }),
    prisma.comment.findMany({ where: { createdAt: { gte: start14 } }, select: { createdAt: true, userId: true } }),
    prisma.post.count({ where: { deletedAt: null } }),
    prisma.user.count(),
    prisma.mcpCallLog.count(),
    prisma.mcpCallLog.groupBy({
      by: ['postId'], where: { postId: { not: null } }, _count: true,
      orderBy: { _count: { postId: 'desc' } }, take: 5,
    }),
  ]);

  // 趋势桶
  const trend = dayKeys.map((k) => ({ date: k, posts: 0, users: 0, mcpCalls: 0, activeUsers: new Set<number>() }));
  const idx = (k: string) => dayKeys.indexOf(k);
  for (const p of postsRecent) { const i = idx(dayKey(p.createdAt)); if (i >= 0) { trend[i].posts++; trend[i].activeUsers.add(p.userId); } }
  for (const u of usersRecent) { const i = idx(dayKey(u.createdAt)); if (i >= 0) trend[i].users++; }
  for (const m of mcpRecent) { const i = idx(dayKey(m.createdAt)); if (i >= 0) { trend[i].mcpCalls++; trend[i].activeUsers.add(m.userId); } }
  for (const c of commentsRecent) { const i = idx(dayKey(c.createdAt)); if (i >= 0) trend[i].activeUsers.add(c.userId); }

  const todayKey = dayKey(now);
  const todayIdx = idx(todayKey);
  const todayTrend = todayIdx >= 0 ? trend[todayIdx] : null;

  // 热门 Skill 标题
  const topPostIds = topSkillsLogs.map((s) => s.postId!).filter(Boolean);
  const topPosts = topPostIds.length
    ? await prisma.post.findMany({ where: { id: { in: topPostIds }, deletedAt: null }, select: { id: true, title: true } })
    : [];
  const titleMap = new Map(topPosts.map((p) => [p.id, p.title]));
  const topSkills = topSkillsLogs
    .filter((s) => s.postId && titleMap.has(s.postId))
    .map((s) => ({ postId: s.postId!, title: titleMap.get(s.postId!)!, calls: s._count }));

  // ============ Pressure ============
  // DB 探测延迟 + Neon 连接数（best-effort）
  let dbLatencyMs: number | null = null;
  let connections: { state: string; count: number }[] = [];
  try {
    const t0 = now.getTime();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - t0;
    const rows = await prisma.$queryRaw<{ state: string; count: bigint }[]>`
      SELECT state, count(*)::bigint AS count
      FROM pg_stat_activity
      WHERE datname = current_database()
      GROUP BY state`;
    connections = rows.map((r) => ({ state: r.state || 'unknown', count: Number(r.count) }));
  } catch {
    /* pg_stat_activity 受限时忽略，latency 可能也失败 */
  }

  // API 响应时间 / 错误率（最近 24h MetricSample，内存算分位数）
  // best-effort：MetricSample 表在 schema 迁移前可能不存在，失败则按无样本处理
  const since24h = new Date(now.getTime() - 24 * 86_400_000);
  let samples: { route: string; status: number; durationMs: number; error: boolean }[] = [];
  try {
    samples = await prisma.metricSample.findMany({
      where: { createdAt: { gte: since24h } },
      select: { route: true, status: true, durationMs: true, error: true },
      take: 8000,
      orderBy: { createdAt: 'desc' },
    });
  } catch {
    samples = [];
  }

  const durations = samples.map((s) => s.durationMs).sort((a, b) => a - b);
  const pct = (arr: number[], p: number) => (arr.length === 0 ? 0 : arr[Math.min(arr.length - 1, Math.floor(arr.length * p))]);
  const avg = (arr: number[]) => (arr.length === 0 ? 0 : Math.round(arr.reduce((a, b) => a + b, 0) / arr.length));
  const errorCount = samples.filter((s) => s.error).length;

  // 按路由聚合
  const byRouteMap = new Map<string, { count: number; totalMs: number; errors: number }>();
  for (const s of samples) {
    const e = byRouteMap.get(s.route) || { count: 0, totalMs: 0, errors: 0 };
    e.count++; e.totalMs += s.durationMs; if (s.error) e.errors++;
    byRouteMap.set(s.route, e);
  }
  const byRoute = Array.from(byRouteMap.entries())
    .map(([route, v]) => ({ route, count: v.count, avgMs: Math.round(v.totalMs / v.count), errors: v.errors }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    traffic: {
      today: {
        newPosts: todayTrend?.posts ?? 0,
        newUsers: todayTrend?.users ?? 0,
        mcpCalls: todayTrend?.mcpCalls ?? 0,
        activeUsers: todayTrend?.activeUsers.size ?? 0,
      },
      totals: { posts: totalPosts, users: totalUsers, mcpCalls: totalMcp },
      trend: trend.map((t) => ({ date: t.date, posts: t.posts, users: t.users, mcpCalls: t.mcpCalls, activeUsers: t.activeUsers.size })),
      topSkills,
    },
    pressure: {
      db: { latencyMs: dbLatencyMs, connections },
      api: {
        sampleCount: samples.length,
        avgMs: avg(durations),
        p50Ms: pct(durations, 0.5),
        p95Ms: pct(durations, 0.95),
        errorCount,
        errorRate: samples.length === 0 ? 0 : errorCount / samples.length,
        byRoute,
      },
    },
    fetchedAt: now.toISOString(),
  });
}
