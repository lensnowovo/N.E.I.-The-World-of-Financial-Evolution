import type { Prisma } from '@prisma/client';
import { prisma } from './db';

export const ACTIVITY_EVENT = {
  PAGE_VIEW: 'page_view',
  SEARCH: 'search',
  FILTER: 'filter',
  POST_VIEW: 'post_view',
  FAVORITE_ADD: 'favorite_add',
  FAVORITE_REMOVE: 'favorite_remove',
  POST_CREATE: 'post_create',
  COMMENT_CREATE: 'comment_create',
  MCP_TOKEN_CREATE: 'mcp_token_create',
  MCP_TOKEN_DELETE: 'mcp_token_delete',
  MCP_CALL: 'mcp_call',
} as const;

export type ActivityEventType = (typeof ACTIVITY_EVENT)[keyof typeof ACTIVITY_EVENT];

type MetadataValue = string | number | boolean | null;

type TrackActivityInput = {
  type: ActivityEventType | string;
  userId?: number | null;
  anonymousId?: string | null;
  entityType?: string | null;
  entityId?: number | null;
  source?: string | null;
  metadata?: Record<string, MetadataValue> | null;
};

const MAX_SOURCE_LENGTH = 120;
const MAX_ANONYMOUS_ID_LENGTH = 80;
const MAX_METADATA_KEYS = 12;
const MAX_STRING_VALUE_LENGTH = 160;

export function normalizeAnonymousId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_ANONYMOUS_ID_LENGTH) return null;
  if (!/^[a-zA-Z0-9:_-]+$/.test(trimmed)) return null;
  return trimmed;
}

function normalizeMetadata(
  metadata?: Record<string, MetadataValue> | null,
): Prisma.InputJsonObject | undefined {
  if (!metadata) return undefined;
  const out: Record<string, Prisma.InputJsonValue> = {};
  for (const [key, value] of Object.entries(metadata).slice(0, MAX_METADATA_KEYS)) {
    if (!/^[a-zA-Z0-9_.-]{1,40}$/.test(key)) continue;
    if (typeof value === 'string') {
      out[key] = value.slice(0, MAX_STRING_VALUE_LENGTH);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function trackActivity(input: TrackActivityInput): void {
  const type = String(input.type || '').trim().slice(0, 60);
  if (!type) return;

  const anonymousId = normalizeAnonymousId(input.anonymousId);
  const userId = typeof input.userId === 'number' && Number.isFinite(input.userId) ? input.userId : null;

  prisma.activityEvent
    .create({
      data: {
        type,
        userId,
        anonymousId,
        entityType: input.entityType ? String(input.entityType).slice(0, 40) : null,
        entityId: typeof input.entityId === 'number' && Number.isFinite(input.entityId) ? input.entityId : null,
        source: input.source ? String(input.source).slice(0, MAX_SOURCE_LENGTH) : null,
        metadata: normalizeMetadata(input.metadata),
      },
    })
    .catch(() => {
      /* Analytics must never block product flows. */
    });
}
