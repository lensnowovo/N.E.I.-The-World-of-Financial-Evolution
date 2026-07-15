export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { POST_STATUS } from '@/lib/status';
import { extractReadableText } from '@/lib/skill-text';
import { normalizePublicText } from '@/lib/public-url';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/dashboard');
  const uid = me.id;

  const [userWithKey, activeAccessTokens] = await Promise.all([
    prisma.user.findUnique({
      where: { id: uid },
      select: { mcpTokenHash: true, tokenLastUsedAt: true },
    }),
    prisma.mcpAccessToken.findMany({
      where: { userId: uid, revokedAt: null },
      select: { lastUsedAt: true },
    }),
  ]);
  const activeTokenCount = activeAccessTokens.length + (userWithKey?.mcpTokenHash ? 1 : 0);
  const connectedTokenCount = activeAccessTokens.filter((token) => token.lastUsedAt).length
    + (userWithKey?.mcpTokenHash && userWithKey.tokenLastUsedAt ? 1 : 0);
  const hasMcpToken = activeTokenCount > 0;
  const latestTokenUse = [
    userWithKey?.tokenLastUsedAt ?? null,
    ...activeAccessTokens.map((token) => token.lastUsedAt),
  ].filter((value): value is Date => Boolean(value)).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  // DASH-003 MCP 调用历史：最近 10 条（server 端查好传给 client）
  const mcpCallLogsRaw = await prisma.mcpCallLog.findMany({
    where: { userId: uid },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, tool: true, postId: true, clientName: true, createdAt: true },
  });
  const mcpCallLogs = mcpCallLogsRaw.map((l) => ({
    id: l.id,
    tool: l.tool,
    postId: l.postId,
    clientName: l.clientName,
    createdAt: l.createdAt.toISOString(),
  }));

  // DASH-001 概览统计：5 个数据卡片（server 端查好一次性传给 client）
  const [
    favoriteCount,
    publishedCount,
    receivedFavoritesAgg,
    mcpCallsCount,
  ] = await Promise.all([
    // 1. 我的收藏数
    prisma.postFavorite.count({ where: { userId: uid } }),
    // 2. 我的发布数（仅 published + 未软删）
    prisma.post.count({
      where: { userId: uid, status: POST_STATUS.PUBLISHED, deletedAt: null },
    }),
    // 3. 被收藏数：我的帖被收藏的总数（聚合 postFavorite join post where userId=me）
    prisma.postFavorite.count({
      where: {
        post: {
          userId: uid,
          status: POST_STATUS.PUBLISHED,
          deletedAt: null,
        },
      },
    }),
    // 4. MCP 调用数
    prisma.mcpCallLog.count({ where: { userId: uid } }),
  ]);

  // DASH-002 我的发布：列出当前用户 published 且未软删的帖子，按 updatedAt desc
  const myPostsRaw = await prisma.post.findMany({
    where: { userId: uid, status: POST_STATUS.PUBLISHED, deletedAt: null },
    select: {
      id: true,
      title: true,
      tagScene: true,
      viewCount: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });
  const myPosts = myPostsRaw.map((p) => ({
    id: p.id,
    title: p.title,
    tagScene: p.tagScene,
    viewCount: p.viewCount,
    updatedAt: p.updatedAt.toISOString(),
  }));

  // 收藏列表（带 sortOrder + note）
  const favs = await prisma.postFavorite.findMany({
    where: { userId: uid },
    include: {
      post: {
        select: {
          id: true, title: true, tagScene: true, tagSkill: true, status: true,
          author: { select: { nickname: true } },
          skillAsset: { select: { assetType: true, originalAuthor: true } },
        },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    take: 50,
  });

  const items = favs
    .filter((f) => f.post.status === POST_STATUS.PUBLISHED)
    .map((f) => ({
      favoriteId: f.id,
      postId: f.post.id,
      sortOrder: f.sortOrder,
      note: f.note,
      title: f.post.title,
      tagScene: f.post.tagScene,
      tagSkill: f.post.tagSkill,
      assetType: f.post.skillAsset?.assetType ?? null,
      originalAuthor: f.post.skillAsset?.originalAuthor ?? null,
      author: f.post.author.nickname,
    }));

  // MCP 调用统计
  const [totalCalls, last7DaysLogs, topSkillsLogs, allCallPostIds, listMySkillsCalls] = await Promise.all([
    prisma.mcpCallLog.count({ where: { userId: uid } }),
    prisma.mcpCallLog.count({
      where: { userId: uid, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
    }),
    prisma.mcpCallLog.groupBy({
      by: ['postId'],
      where: { userId: uid, postId: { not: null } },
      _count: true,
      orderBy: { _count: { postId: 'desc' } },
      take: 5,
    }),
    prisma.mcpCallLog.findMany({
      where: { userId: uid, postId: { not: null } },
      select: { postId: true },
      distinct: ['postId'],
    }),
    prisma.mcpCallLog.count({ where: { userId: uid, tool: 'list_my_skills' } }),
  ]);

  // Get titles for top skills
  const topPostIds = topSkillsLogs.map((s) => s.postId!).filter(Boolean);
  const topPosts = topPostIds.length > 0
    ? await prisma.post.findMany({ where: { id: { in: topPostIds }, deletedAt: null }, select: { id: true, title: true } })
    : [];
  const titleMap = new Map(topPosts.map((p) => [p.id, p.title]));

  const topSkills = topSkillsLogs
    .filter((s) => s.postId && titleMap.has(s.postId))
    .map((s) => ({ postId: s.postId!, title: titleMap.get(s.postId!)!, calls: s._count }));

  // Sleeping: favorited but never called
  const calledPostIds = new Set(allCallPostIds.map((c) => c.postId).filter(Boolean) as number[]);
  const sleeping = items
    .filter((i) => !calledPostIds.has(i.postId))
    .map((i) => ({ postId: i.postId, title: i.title }));

  const stats = { totalCalls, last7Days: last7DaysLogs, topSkills, sleeping };

  const disciplinePostsRaw = await prisma.post.findMany({
    where: {
      status: POST_STATUS.PUBLISHED,
      deletedAt: null,
      mcpApproved: true,
      skillAsset: { is: { assetType: 'agent-discipline' } },
    },
    select: {
      id: true,
      title: true,
      body: true,
      updatedAt: true,
      skillAsset: { select: { assetType: true, usageNotes: true } },
    },
    orderBy: [{ featured: 'desc' }, { id: 'asc' }],
  });
  const disciplines = disciplinePostsRaw.map((post) => ({
    id: post.id,
    title: post.title,
    assetType: post.skillAsset?.assetType ?? 'agent-discipline',
    usageNotes: post.skillAsset?.usageNotes ?? null,
    updatedAt: post.updatedAt.toISOString(),
    text: normalizePublicText(extractReadableText(post.body)),
    isDefault: post.body.includes('slug:nei-discipline/fiduciary-research-v1'),
  }));
  const defaultDiscipline = disciplines.find((discipline) => discipline.isDefault) ?? disciplines[0] ?? null;

  return (
    <div className="mx-auto max-w-page px-4 py-8 sm:px-6 sm:py-10">
      <header className="relative mb-7 overflow-hidden border-y border-paper-edge bg-vellum/55">
        <div className="pointer-events-none absolute -right-2 -top-7 font-serif text-[120px] leading-none tracking-[-0.07em] text-gilded opacity-[0.05]" aria-hidden="true">DESK</div>
        <div className="relative grid lg:grid-cols-[minmax(0,1.3fr)_minmax(330px,0.7fr)]">
          <div className="px-5 py-7 sm:px-8 sm:py-9">
            <Link href="/" className="mb-5 inline-flex font-serif text-sm italic text-sepia transition-colors hover:text-ink-brown">← 返回首页</Link>
            <p className="font-display text-[10px] uppercase tracking-[0.22em] text-gilded">Private work desk</p>
            <h1 className="mt-2 font-serif text-3xl text-ink-brown sm:text-4xl">{me.nickname} 的工作台</h1>
            <p className="mt-3 max-w-2xl font-sans text-sm leading-7 text-leather">
              继续整理收藏、维护自己的贡献，确认 Agent 是否在正常调用 N.E.I.。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/publish" className="inline-flex h-9 items-center border border-ink-brown bg-ink-brown px-4 font-serif text-sm text-parchment transition-colors hover:bg-sepia">发布 Skill</Link>
              <Link href={`/profile/${uid}`} className="inline-flex h-9 items-center border border-paper-edge bg-vellum px-4 font-serif text-sm text-leather transition-colors hover:border-ink-brown hover:text-ink-brown">查看个人主页</Link>
              <Link href="/connect" className="inline-flex h-9 items-center px-3 font-serif text-sm italic text-leather transition-colors hover:text-ink-brown">管理 Agent →</Link>
            </div>
          </div>
          <aside className="border-t border-paper-edge bg-parchment/35 px-5 py-7 sm:px-7 lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between border-b border-paper-edge pb-3">
              <span className="font-display text-[10px] uppercase tracking-[0.2em] text-sepia">Desk brief</span>
              <span className={connectedTokenCount > 0 ? 'font-mono text-[10px] text-moss' : 'font-mono text-[10px] text-sepia'}>
                {connectedTokenCount > 0 ? `${connectedTokenCount} Agent online` : 'Agent offline'}
              </span>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5">
              <DashboardMetric value={favoriteCount} label="收藏库" />
              <DashboardMetric value={publishedCount} label="公开发布" />
              <DashboardMetric value={receivedFavoritesAgg} label="被收藏" />
              <DashboardMetric value={mcpCallsCount} label="MCP 调用" />
            </dl>
            <p className="mt-5 border-t border-paper-edge pt-3 font-sans text-xs leading-5 text-sepia">
              {latestTokenUse ? <>最近连接于 <TimeStamp value={latestTokenUse} /></> : '尚未产生真实 Agent 调用'}
            </p>
          </aside>
        </div>
      </header>

      <DashboardClient
        initialItems={items}
        initialStats={stats}
        myPosts={myPosts}
        hasMcpToken={hasMcpToken}
        activeTokenCount={activeTokenCount}
        connectedTokenCount={connectedTokenCount}
        mcpCallLogs={mcpCallLogs}
        defaultDiscipline={defaultDiscipline}
        disciplines={disciplines}
        mcpOnboardingStatus={{
          favoriteCount: items.length,
          hasMcpToken,
          tokenLastUsedAt: latestTokenUse?.toISOString() ?? null,
          lastMcpCallAt: mcpCallLogs[0]?.createdAt ?? null,
          hasAnyMcpCall: totalCalls > 0,
          hasListMySkillsCall: listMySkillsCalls > 0,
          isConnected: totalCalls > 0,
        }}
        userId={uid}
      />
    </div>
  );
}

function DashboardMetric({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col">
      <dt className="order-2 mt-1 font-sans text-[10px] text-sepia">{label}</dt>
      <dd className="order-1 font-serif text-2xl text-ink-brown num-osf">{value}</dd>
    </div>
  );
}

function TimeStamp({ value }: { value: Date }) {
  return <time dateTime={value.toISOString()}>{value.toLocaleDateString('zh-CN')}</time>;
}
