import { createHash } from 'node:crypto';

export const MAX_ACTIVITY_BODY_BYTES = 4 * 1024;

export function normalizeActivityPath(value: unknown): string {
  if (typeof value !== 'string') return '/';
  const path = value.trim();
  if (!path.startsWith('/')) return '/';

  // Analytics only needs the route. Query strings and fragments can contain
  // search terms, invite codes or other sensitive values and must not be stored.
  const routeOnly = path.split(/[?#]/, 1)[0];
  return routeOnly.slice(0, 120) || '/';
}

/**
 * 只把公开详情页 /posts/:id 识别为一次 Skill 浏览。
 * 查询参数不影响识别；其他页面只记录 page_view，不修改 Post.viewCount。
 */
export function postIdFromActivityPath(path: string): number | null {
  const match = /^\/posts\/(\d+)(?:[/?#]|$)/.exec(path);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** 低基数 endpoint 使用固定长度摘要，避免把访问路径或查询参数写进限流表。 */
export function activityPathFingerprint(path: string): string {
  return createHash('sha256').update(path).digest('hex').slice(0, 16);
}

export function activityActorSubject(
  userId: number | null,
  anonymousId: string | null,
  ip: string,
): string {
  if (userId) return `user:${userId}`;
  if (anonymousId) return `anonymous:${anonymousId}`;
  return `ip:${ip}`;
}
