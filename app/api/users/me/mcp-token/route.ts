import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/db';
import { getSessionUid } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * POST /api/users/me/mcp-token —— 生成或重新生成 MCP Token
 *
 * 返回明文 token（只显示一次）。DB 里只存 hash。
 * Token 格式：nei_<32 hex chars>
 */
export async function POST() {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const plain = 'nei_' + crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(plain).digest('hex');

  // SEC-008: 记录 token 创建时间，便于排查泄露；tokenLastUsedAt 在首次 MCP 鉴权时写入
  await prisma.user.update({
    where: { id: uid },
    data: {
      mcpTokenHash: hash,
      tokenCreatedAt: new Date(),
    },
  });

  return NextResponse.json({ token: plain });
}

/**
 * DELETE /api/users/me/mcp-token —— 撤销 MCP Token
 */
export async function DELETE() {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  await prisma.user.update({
    where: { id: uid },
    data: { mcpTokenHash: null },
  });

  return NextResponse.json({ ok: true });
}
