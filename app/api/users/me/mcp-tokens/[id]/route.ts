import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUid } from '@/lib/session';
import { ACTIVITY_EVENT, trackActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const { id } = await params;
  if (id === 'legacy') {
    const result = await prisma.user.updateMany({
      where: { id: uid, mcpTokenHash: { not: null } },
      data: {
        mcpTokenHash: null,
        tokenCreatedAt: null,
        tokenLastUsedAt: null,
      },
    });
    if (result.count === 0) return NextResponse.json({ error: 'Token 不存在或已撤销' }, { status: 404 });
  } else {
    const tokenId = Number(id);
    if (!Number.isInteger(tokenId) || tokenId <= 0) {
      return NextResponse.json({ error: '无效的 Token ID' }, { status: 400 });
    }
    const result = await prisma.mcpAccessToken.updateMany({
      where: { id: tokenId, userId: uid, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) return NextResponse.json({ error: 'Token 不存在或已撤销' }, { status: 404 });
  }

  trackActivity({
    type: ACTIVITY_EVENT.MCP_TOKEN_DELETE,
    userId: uid,
    source: 'web',
    metadata: { tokenId: id },
  });

  return NextResponse.json({ ok: true });
}
