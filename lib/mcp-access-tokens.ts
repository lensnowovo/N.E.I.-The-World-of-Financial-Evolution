import crypto from 'node:crypto';

export const MAX_ACTIVE_MCP_TOKENS = 8;

export const MCP_CLIENT_TYPES = ['codex', 'claude-code', 'workbuddy', 'other'] as const;
export type McpClientType = (typeof MCP_CLIENT_TYPES)[number];

export function issueMcpAccessToken() {
  const plain = `nei_${crypto.randomBytes(24).toString('hex')}`;
  return {
    plain,
    hash: hashMcpAccessToken(plain),
    hint: plain.slice(-6),
  };
}

export function hashMcpAccessToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function normalizeMcpTokenName(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback;
  const normalized = value.replace(/\s+/g, ' ').trim().slice(0, 48);
  return normalized || fallback;
}

export function isMcpClientType(value: unknown): value is McpClientType {
  return typeof value === 'string' && MCP_CLIENT_TYPES.includes(value as McpClientType);
}
