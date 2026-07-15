import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUid } from '@/lib/session';
import { POST_STATUS } from '@/lib/status';

export const dynamic = 'force-dynamic';

export async function GET() {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const [user, favoriteCount, activeTokens] = await Promise.all([
    prisma.user.findUnique({
      where: { id: uid },
      select: { mcpTokenHash: true, tokenCreatedAt: true, tokenLastUsedAt: true },
    }),
    prisma.postFavorite.count({
      where: {
        userId: uid,
        post: { status: POST_STATUS.PUBLISHED, deletedAt: null },
      },
    }),
    prisma.mcpAccessToken.findMany({
      where: { userId: uid, revokedAt: null },
      select: { id: true, lastUsedAt: true, createdAt: true },
    }),
  ]);

  if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

  const tokenIds = activeTokens.map((token) => token.id);
  const currentTokenCalls = {
    userId: uid,
    OR: [
      ...(tokenIds.length > 0 ? [{ tokenId: { in: tokenIds } }] : []),
      ...(user.mcpTokenHash && user.tokenCreatedAt
        ? [{ tokenId: null, createdAt: { gte: user.tokenCreatedAt } }]
        : []),
    ],
  };

  const hasCurrentToken = tokenIds.length > 0 || Boolean(user.mcpTokenHash);
  const [callCount, searchCallCount, listCallCount, lastMcpCall] = hasCurrentToken
    ? await Promise.all([
        prisma.mcpCallLog.count({ where: currentTokenCalls }),
        prisma.mcpCallLog.count({ where: { ...currentTokenCalls, tool: 'search_skills' } }),
        prisma.mcpCallLog.count({ where: { ...currentTokenCalls, tool: 'list_my_skills' } }),
        prisma.mcpCallLog.findFirst({
          where: currentTokenCalls,
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
      ])
    : [0, 0, 0, null];

  const lastUsedDates = [
    user.tokenLastUsedAt,
    ...activeTokens.map((token) => token.lastUsedAt),
  ].filter((value): value is Date => Boolean(value));
  const latestTokenUse = lastUsedDates.sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  return NextResponse.json({
    favoriteCount,
    hasMcpToken: hasCurrentToken,
    activeTokenCount: tokenIds.length + (user.mcpTokenHash ? 1 : 0),
    tokenLastUsedAt: latestTokenUse?.toISOString() ?? null,
    lastMcpCallAt: lastMcpCall?.createdAt.toISOString() ?? null,
    hasAnyMcpCall: callCount > 0,
    hasSearchSkillsCall: searchCallCount > 0,
    hasListMySkillsCall: listCallCount > 0,
    isConnected: callCount > 0,
  });
}
