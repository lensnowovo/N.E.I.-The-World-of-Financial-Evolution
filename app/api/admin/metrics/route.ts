import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-guard';
import { ACTIVITY_EVENT } from '@/lib/activity';
import { POST_STATUS } from '@/lib/status';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const DAY_MS = 86_400_000;
const CN_OFFSET_MS = 8 * 60 * 60 * 1000;

function cnDayKey(date: Date): string {
  return new Date(date.getTime() + CN_OFFSET_MS).toISOString().slice(0, 10);
}

function cnStartUtc(dayKey: string): Date {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) - CN_OFFSET_MS);
}

function pct(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  return arr[Math.min(arr.length - 1, Math.floor(arr.length * p))];
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.round(arr.reduce((sum, item) => sum + item, 0) / arr.length);
}

function addDistinct(set: Set<string>, userId?: number | null, anonymousId?: string | null) {
  if (userId) {
    set.add(`u:${userId}`);
  } else if (anonymousId) {
    set.add(`a:${anonymousId}`);
  }
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const now = new Date();
  const todayKey = cnDayKey(now);
  const todayStart = cnStartUtc(todayKey);
  const start14 = new Date(todayStart.getTime() - 13 * DAY_MS);
  const start30 = new Date(todayStart.getTime() - 29 * DAY_MS);
  const yesterdayStart = new Date(todayStart.getTime() - DAY_MS);

  const dayKeys = Array.from({ length: 14 }, (_, index) => cnDayKey(new Date(start14.getTime() + index * DAY_MS)));

  const [
    activitiesRecent,
    usersRecent,
    postsRecent,
    favoritesRecent,
    commentsRecent,
    mcpRecent,
    totalPosts,
    totalUsers,
    totalMcp,
    totalFavorites,
    featuredCount,
    publishedCount,
    pendingCount,
    mcpReadyCount,
    tokenUsers,
    tokenUsedUsers,
    cohortUsers30,
    cohortFavorites30,
    cohortMcp30,
    yesterdayUsers,
    todayActivityEvents,
    todayFavorites,
    todayComments,
    todayMcp,
    topMcpLogs,
    topFavoriteLogs,
    contentRows,
  ] = await Promise.all([
    prisma.activityEvent.findMany({
      where: { createdAt: { gte: start14 } },
      select: { type: true, source: true, userId: true, anonymousId: true, createdAt: true },
    }),
    prisma.user.findMany({ where: { createdAt: { gte: start14 } }, select: { id: true, createdAt: true } }),
    prisma.post.findMany({
      where: { createdAt: { gte: start14 }, deletedAt: null },
      select: { id: true, userId: true, status: true, createdAt: true },
    }),
    prisma.postFavorite.findMany({
      where: { createdAt: { gte: start14 } },
      select: { userId: true, postId: true, createdAt: true },
    }),
    prisma.comment.findMany({
      where: { createdAt: { gte: start14 } },
      select: { userId: true, postId: true, createdAt: true },
    }),
    prisma.mcpCallLog.findMany({
      where: { createdAt: { gte: start14 } },
      select: { userId: true, postId: true, tool: true, createdAt: true },
    }),
    prisma.post.count({ where: { deletedAt: null } }),
    prisma.user.count(),
    prisma.mcpCallLog.count(),
    prisma.postFavorite.count(),
    prisma.post.count({ where: { featured: true, deletedAt: null } }),
    prisma.post.count({ where: { status: POST_STATUS.PUBLISHED, deletedAt: null } }),
    prisma.post.count({ where: { status: POST_STATUS.PENDING, deletedAt: null } }),
    prisma.post.count({ where: { mcpApproved: true, status: POST_STATUS.PUBLISHED, deletedAt: null } }),
    prisma.user.count({ where: { mcpTokenHash: { not: null } } }),
    prisma.user.count({ where: { tokenLastUsedAt: { not: null } } }),
    prisma.user.findMany({
      where: { createdAt: { gte: start30 } },
      select: { id: true, createdAt: true, mcpTokenHash: true, tokenLastUsedAt: true },
    }),
    prisma.postFavorite.findMany({
      where: { createdAt: { gte: start30 } },
      select: { userId: true, createdAt: true },
    }),
    prisma.mcpCallLog.findMany({
      where: { createdAt: { gte: start30 } },
      select: { userId: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
      select: { id: true },
    }),
    prisma.activityEvent.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { userId: true, anonymousId: true },
    }),
    prisma.postFavorite.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { userId: true },
    }),
    prisma.comment.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { userId: true },
    }),
    prisma.mcpCallLog.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { userId: true },
    }),
    prisma.mcpCallLog.groupBy({
      by: ['postId'],
      where: { postId: { not: null } },
      _count: true,
      orderBy: { _count: { postId: 'desc' } },
      take: 8,
    }),
    prisma.postFavorite.groupBy({
      by: ['postId'],
      _count: true,
      orderBy: { _count: { postId: 'desc' } },
      take: 8,
    }),
    prisma.post.findMany({
      where: { status: POST_STATUS.PUBLISHED, deletedAt: null },
      select: {
        id: true,
        title: true,
        mcpApproved: true,
        viewCount: true,
        _count: { select: { stars: true, comments: true } },
      },
      take: 500,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const trend = dayKeys.map((date) => ({
    date,
    pageViews: 0,
    webActive: new Set<string>(),
    mcpActive: new Set<string>(),
    engaged: new Set<string>(),
    newUsers: 0,
    newPosts: 0,
    favorites: 0,
    comments: 0,
    searches: 0,
    mcpCalls: 0,
  }));
  const trendByDate = new Map(trend.map((row) => [row.date, row]));

  for (const event of activitiesRecent) {
    const row = trendByDate.get(cnDayKey(event.createdAt));
    if (!row) continue;
    if (event.type === ACTIVITY_EVENT.PAGE_VIEW) row.pageViews++;
    if (event.type === ACTIVITY_EVENT.SEARCH || event.type === ACTIVITY_EVENT.FILTER) row.searches++;
    if (event.source === 'mcp') {
      addDistinct(row.mcpActive, event.userId, event.anonymousId);
    } else {
      addDistinct(row.webActive, event.userId, event.anonymousId);
    }
    addDistinct(row.engaged, event.userId, event.anonymousId);
  }
  for (const user of usersRecent) {
    const row = trendByDate.get(cnDayKey(user.createdAt));
    if (row) row.newUsers++;
  }
  for (const post of postsRecent) {
    const row = trendByDate.get(cnDayKey(post.createdAt));
    if (!row) continue;
    row.newPosts++;
    addDistinct(row.engaged, post.userId);
  }
  for (const favorite of favoritesRecent) {
    const row = trendByDate.get(cnDayKey(favorite.createdAt));
    if (!row) continue;
    row.favorites++;
    addDistinct(row.webActive, favorite.userId);
    addDistinct(row.engaged, favorite.userId);
  }
  for (const comment of commentsRecent) {
    const row = trendByDate.get(cnDayKey(comment.createdAt));
    if (!row) continue;
    row.comments++;
    addDistinct(row.webActive, comment.userId);
    addDistinct(row.engaged, comment.userId);
  }
  for (const call of mcpRecent) {
    const row = trendByDate.get(cnDayKey(call.createdAt));
    if (!row) continue;
    row.mcpCalls++;
    addDistinct(row.mcpActive, call.userId);
    addDistinct(row.engaged, call.userId);
  }

  const today = trendByDate.get(todayKey);

  const activityByType = new Map<string, number>();
  const activityBySource = new Map<string, number>();
  for (const event of activitiesRecent) {
    activityByType.set(event.type, (activityByType.get(event.type) ?? 0) + 1);
    activityBySource.set(event.source ?? 'unknown', (activityBySource.get(event.source ?? 'unknown') ?? 0) + 1);
  }

  const cohortIds = new Set(cohortUsers30.map((user) => user.id));
  const favoritedUsers30 = new Set(cohortFavorites30.filter((row) => cohortIds.has(row.userId)).map((row) => row.userId));
  const mcpCountsByUser = new Map<number, number>();
  for (const call of cohortMcp30) {
    if (!cohortIds.has(call.userId)) continue;
    mcpCountsByUser.set(call.userId, (mcpCountsByUser.get(call.userId) ?? 0) + 1);
  }
  const yesterdayUserIds = new Set(yesterdayUsers.map((user) => user.id));
  const todayActiveIds = new Set<number>();
  for (const event of todayActivityEvents) if (event.userId) todayActiveIds.add(event.userId);
  for (const favorite of todayFavorites) todayActiveIds.add(favorite.userId);
  for (const comment of todayComments) todayActiveIds.add(comment.userId);
  for (const call of todayMcp) todayActiveIds.add(call.userId);
  const yesterdayRetained = [...yesterdayUserIds].filter((id) => todayActiveIds.has(id)).length;

  const topPostIds = [
    ...new Set([
      ...topMcpLogs.map((row) => row.postId).filter((id): id is number => Boolean(id)),
      ...topFavoriteLogs.map((row) => row.postId),
    ]),
  ];
  const topPosts = topPostIds.length
    ? await prisma.post.findMany({
        where: { id: { in: topPostIds }, deletedAt: null },
        select: { id: true, title: true },
      })
    : [];
  const titleMap = new Map(topPosts.map((post) => [post.id, post.title]));
  const mcpPostIds = new Set(mcpRecent.map((call) => call.postId).filter((id): id is number => Boolean(id)));
  const zeroFavorites = contentRows.filter((post) => post._count.stars === 0).length;
  const zeroMcpCalls = contentRows.filter((post) => post.mcpApproved && !mcpPostIds.has(post.id)).length;

  let dbLatencyMs: number | null = null;
  let connections: { state: string; count: number }[] = [];
  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - t0;
    const rows = await prisma.$queryRaw<{ state: string; count: bigint }[]>`
      SELECT state, count(*)::bigint AS count
      FROM pg_stat_activity
      WHERE datname = current_database()
      GROUP BY state`;
    connections = rows.map((row) => ({ state: row.state || 'unknown', count: Number(row.count) }));
  } catch {
    /* best effort */
  }

  let samples: { route: string; status: number; durationMs: number; error: boolean }[] = [];
  try {
    samples = await prisma.metricSample.findMany({
      where: { createdAt: { gte: new Date(now.getTime() - DAY_MS) } },
      select: { route: true, status: true, durationMs: true, error: true },
      take: 8000,
      orderBy: { createdAt: 'desc' },
    });
  } catch {
    samples = [];
  }
  const durations = samples.map((sample) => sample.durationMs).sort((a, b) => a - b);
  const errorCount = samples.filter((sample) => sample.error).length;
  const byRouteMap = new Map<string, { count: number; totalMs: number; errors: number }>();
  for (const sample of samples) {
    const item = byRouteMap.get(sample.route) || { count: 0, totalMs: 0, errors: 0 };
    item.count++;
    item.totalMs += sample.durationMs;
    if (sample.error) item.errors++;
    byRouteMap.set(sample.route, item);
  }

  return NextResponse.json({
    traffic: {
      timezone: 'Asia/Shanghai',
      today: {
        pageViews: today?.pageViews ?? 0,
        webActiveUsers: today?.webActive.size ?? 0,
        mcpActiveUsers: today?.mcpActive.size ?? 0,
        engagedUsers: today?.engaged.size ?? 0,
        newUsers: today?.newUsers ?? 0,
        newPosts: today?.newPosts ?? 0,
        favorites: today?.favorites ?? 0,
        searches: today?.searches ?? 0,
        mcpCalls: today?.mcpCalls ?? 0,
      },
      totals: { posts: totalPosts, users: totalUsers, mcpCalls: totalMcp, favorites: totalFavorites },
      trend: trend.map((row) => ({
        date: row.date,
        pageViews: row.pageViews,
        webActiveUsers: row.webActive.size,
        mcpActiveUsers: row.mcpActive.size,
        engagedUsers: row.engaged.size,
        newUsers: row.newUsers,
        newPosts: row.newPosts,
        favorites: row.favorites,
        comments: row.comments,
        searches: row.searches,
        mcpCalls: row.mcpCalls,
      })),
    },
    funnel: {
      windowDays: 30,
      registeredUsers: cohortUsers30.length,
      favoritedUsers: favoritedUsers30.size,
      tokenUsers: cohortUsers30.filter((user) => Boolean(user.mcpTokenHash)).length,
      tokenUsedUsers: cohortUsers30.filter((user) => Boolean(user.tokenLastUsedAt)).length,
      repeatMcpUsers: [...mcpCountsByUser.values()].filter((count) => count >= 2).length,
      yesterdayCohortUsers: yesterdayUsers.length,
      yesterdayRetainedToday: yesterdayRetained,
      yesterdayD1Retention:
        yesterdayUsers.length === 0 ? null : yesterdayRetained / yesterdayUsers.length,
      totalTokenUsers: tokenUsers,
      totalTokenUsedUsers: tokenUsedUsers,
    },
    content: {
      publishedCount,
      pendingCount,
      featuredCount,
      mcpReadyCount,
      zeroFavorites,
      zeroMcpCalls,
      topFavorited: topFavoriteLogs
        .filter((row) => titleMap.has(row.postId))
        .map((row) => ({ postId: row.postId, title: titleMap.get(row.postId)!, count: row._count })),
      topMcp: topMcpLogs
        .filter((row) => row.postId && titleMap.has(row.postId))
        .map((row) => ({ postId: row.postId!, title: titleMap.get(row.postId!)!, count: row._count })),
    },
    activity: {
      byType: [...activityByType.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
      bySource: [...activityBySource.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
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
        byRoute: [...byRouteMap.entries()]
          .map(([route, value]) => ({
            route,
            count: value.count,
            avgMs: Math.round(value.totalMs / value.count),
            errors: value.errors,
          }))
          .sort((a, b) => b.count - a.count),
      },
    },
    fetchedAt: now.toISOString(),
  });
}
