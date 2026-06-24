export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { POST_STATUS } from '@/lib/status';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/dashboard');
  const uid = me.id;

  const userWithKey = await prisma.user.findUnique({
    where: { id: uid },
    select: { apiKeyEnc: true, mcpTokenHash: true },
  });
  const hasApiKey = !!userWithKey?.apiKeyEnc;
  const hasMcpToken = !!userWithKey?.mcpTokenHash;

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
  const [totalCalls, last7DaysLogs, topSkillsLogs, allCallPostIds] = await Promise.all([
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
        hasMcpToken={hasMcpToken}
        hasApiKey={hasApiKey}
        userId={uid}
      />
    </div>
  );
}
