import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUid } from '@/lib/session';
import { POST_STATUS } from '@/lib/status';

export const dynamic = 'force-dynamic';

export async function GET() {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const [user, favoriteCount, hasAnyMcpCall, hasListMySkillsCall] = await Promise.all([
    prisma.user.findUnique({
      where: { id: uid },
      select: { mcpTokenHash: true, tokenLastUsedAt: true },
    }),
    prisma.postFavorite.count({
      where: {
        userId: uid,
        post: { status: POST_STATUS.PUBLISHED, deletedAt: null },
      },
    }),
    prisma.mcpCallLog.count({ where: { userId: uid } }),
    prisma.mcpCallLog.count({ where: { userId: uid, tool: 'list_my_skills' } }),
  ]);

  if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

  return NextResponse.json({
    favoriteCount,
    hasMcpToken: !!user.mcpTokenHash,
    tokenLastUsedAt: user.tokenLastUsedAt?.toISOString() ?? null,
    hasAnyMcpCall: hasAnyMcpCall > 0,
    hasListMySkillsCall: hasListMySkillsCall > 0,
  });
}
