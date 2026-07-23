import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUid } from '@/lib/session';
import {
  MAX_ACTIVE_MCP_TOKENS,
  isMcpClientType,
  issueMcpAccessToken,
  normalizeMcpTokenName,
} from '@/lib/mcp-access-tokens';
import { ACTIVITY_EVENT, trackActivity } from '@/lib/activity';
import { SECRET_RESPONSE_HEADERS } from '@/lib/http-security';

export const dynamic = 'force-dynamic';

type McpTokenResponseItem = {
  id: string;
  name: string;
  clientType: string;
  hint: string;
  createdAt: string | null;
  lastUsedAt: string | null;
  connected: boolean;
  tools: string[];
  legacy: boolean;
};

export async function GET() {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const [user, tokens] = await Promise.all([
    prisma.user.findUnique({
      where: { id: uid },
      select: {
        mcpTokenHash: true,
        tokenCreatedAt: true,
        tokenLastUsedAt: true,
      },
    }),
    prisma.mcpAccessToken.findMany({
      where: { userId: uid, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        callLogs: {
          select: { tool: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
      },
    }),
  ]);

  if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

  const legacyLogs = user.mcpTokenHash && user.tokenCreatedAt
    ? await prisma.mcpCallLog.findMany({
        where: {
          userId: uid,
          tokenId: null,
          createdAt: { gte: user.tokenCreatedAt },
        },
        select: { tool: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      })
    : [];

  const items: McpTokenResponseItem[] = tokens.map((token) => serializeToken(token));
  if (user.mcpTokenHash) {
    items.push({
      id: 'legacy',
      name: '旧版连接 Token',
      clientType: 'other',
      hint: 'legacy',
      createdAt: user.tokenCreatedAt?.toISOString() ?? null,
      lastUsedAt: user.tokenLastUsedAt?.toISOString() ?? null,
      connected: Boolean(
        user.tokenLastUsedAt &&
        user.tokenCreatedAt &&
        user.tokenLastUsedAt >= user.tokenCreatedAt,
      ),
      tools: Array.from(new Set(legacyLogs.map((log) => log.tool))).slice(0, 8),
      legacy: true,
    });
  }

  return NextResponse.json({
    items,
    activeCount: items.length,
    maxActive: MAX_ACTIVE_MCP_TOKENS,
  });
}

export async function POST(req: Request) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // Empty JSON is allowed; defaults are applied below.
  }

  const clientType = isMcpClientType(body.clientType) ? body.clientType : 'other';
  const defaultNames: Record<string, string> = {
    codex: 'Codex',
    'claude-code': 'Claude Code',
    workbuddy: 'Workbuddy',
    other: '其他 Agent',
  };
  const name = normalizeMcpTokenName(body.name, defaultNames[clientType]);

  const [activeNewCount, legacyUser] = await Promise.all([
    prisma.mcpAccessToken.count({ where: { userId: uid, revokedAt: null } }),
    prisma.user.findUnique({ where: { id: uid }, select: { mcpTokenHash: true } }),
  ]);
  const activeCount = activeNewCount + (legacyUser?.mcpTokenHash ? 1 : 0);
  if (activeCount >= MAX_ACTIVE_MCP_TOKENS) {
    return NextResponse.json(
      { error: `当前最多保留 ${MAX_ACTIVE_MCP_TOKENS} 个有效 Token，请先撤销不再使用的连接。` },
      { status: 409 },
    );
  }

  const issued = issueMcpAccessToken();
  const token = await prisma.mcpAccessToken.create({
    data: {
      userId: uid,
      name,
      clientType,
      tokenHash: issued.hash,
      tokenHint: issued.hint,
    },
  });

  trackActivity({
    type: ACTIVITY_EVENT.MCP_TOKEN_CREATE,
    userId: uid,
    source: 'web',
    metadata: { tokenId: token.id, clientType },
  });

  return NextResponse.json(
    {
      token: issued.plain,
      item: serializeToken({ ...token, callLogs: [] }),
    },
    { status: 201, headers: SECRET_RESPONSE_HEADERS },
  );
}

function serializeToken(token: {
  id: number;
  name: string;
  clientType: string | null;
  tokenHint: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  callLogs: Array<{ tool: string; createdAt: Date }>;
}): McpTokenResponseItem {
  return {
    id: String(token.id),
    name: token.name,
    clientType: token.clientType ?? 'other',
    hint: token.tokenHint,
    createdAt: token.createdAt.toISOString(),
    lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
    connected: Boolean(token.lastUsedAt && token.lastUsedAt >= token.createdAt),
    tools: Array.from(new Set(token.callLogs.map((log) => log.tool))).slice(0, 8),
    legacy: false,
  };
}
