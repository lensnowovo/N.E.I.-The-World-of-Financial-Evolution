export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { POST_STATUS } from '@/lib/status';
import { extractPlainText } from '@/lib/skill-text';
import { normalizePublicText } from '@/lib/public-url';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/dashboard');
  const uid = me.id;

  const userWithKey = await prisma.user.findUnique({
    where: { id: uid },
    select: {
      apiKeyEnc: true,
      mcpTokenHash: true,
      tokenCreatedAt: true,
      tokenLastUsedAt: true,
    },
  });
  const hasApiKey = !!userWithKey?.apiKeyEnc;
  const hasMcpToken = !!userWithKey?.mcpTokenHash;
  const mcpTokenCreatedAt = userWithKey?.tokenCreatedAt?.toISOString() ?? null;
  const mcpTokenLastUsedAt = userWithKey?.tokenLastUsedAt?.toISOString() ?? null;

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
    viewSumAgg,
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
    // 4. 被浏览数：我的帖 viewCount 求和
    prisma.post.aggregate({
      where: { userId: uid, status: POST_STATUS.PUBLISHED, deletedAt: null },
      _sum: { viewCount: true },
    }),
    // 5. MCP 调用数
    prisma.mcpCallLog.count({ where: { userId: uid } }),
  ]);

  const overviewStats = {
    favoriteCount,
    publishedCount,
    receivedFavoritesCount: receivedFavoritesAgg,
    viewSum: viewSumAgg._sum.viewCount || 0,
    mcpCallsCount,
  };

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
    text: normalizePublicText(extractPlainText(post.body)),
    isDefault: post.body.includes('slug:nei-discipline/fiduciary-research-v1'),
  }));
  const defaultDiscipline = disciplines.find((discipline) => discipline.isDefault) ?? disciplines[0] ?? null;

  return (
    <div className="mx-auto max-w-page px-4 sm:px-6 py-8">
      <div className="mb-6 pb-5 border-b border-paper-edge">
        <Link href="/" className="inline-flex items-center gap-1.5 font-serif italic text-sm text-sepia hover:text-ink-brown mb-3">
          ← 返回首页
        </Link>
        <div className="flex items-baseline gap-3">
          <h1 className="font-serif text-3xl text-ink-brown">我的控制台</h1>
          <span className="font-mono text-sm text-sepia">{items.length} 个 Skill</span>
        </div>
      </div>

      <DashboardClient
        initialItems={items}
        initialStats={stats}
        overviewStats={overviewStats}
        myPosts={myPosts}
        hasMcpToken={hasMcpToken}
        hasApiKey={hasApiKey}
        mcpTokenCreatedAt={mcpTokenCreatedAt}
        mcpTokenLastUsedAt={mcpTokenLastUsedAt}
        mcpCallLogs={mcpCallLogs}
        defaultDiscipline={defaultDiscipline}
        disciplines={disciplines}
        mcpOnboardingStatus={{
          favoriteCount: items.length,
          hasMcpToken,
          tokenLastUsedAt: mcpTokenLastUsedAt,
          hasAnyMcpCall: totalCalls > 0,
          hasListMySkillsCall: listMySkillsCalls > 0,
        }}
        userId={uid}
      />
    </div>
  );
}
