/**
 * 可复用的纯内存 rate limiter（无运行时依赖）。
 *
 * 设计：
 * - 每个调用方用 (key, limit, windowMs) 三元组语义自行决定限流维度
 *   （如「同 email 3 次 / 10min」「同 IP 10 次 / 10min」）
 * - 固定窗口（fixed window）：首次命中时建桶，桶内计数 +1，达到 limit 后拒绝；
 *   窗口过期后桶整体重置。
 * - 懒过期：读命中时若 expiresAt <= now 视为不存在，复用 slot 重开窗口
 * - 周期清理：每 CLEANUP_INTERVAL_MS 最多扫一次全表，删掉过期桶，避免 Map 无限增长
 *
 * 返回值 retryAfter 单位为毫秒；调用方若要写 HTTP Retry-After 头请自行 Math.ceil(/1000)。
 *
 * 注意：纯内存实现，在多实例 / serverless 多 lambda 实例间不共享。
 * Sprint 0.x 的目标是「基础防护」，足够；后续如需跨实例一致限流，换 Redis 后端。
 */

interface Bucket {
  count: number;
  expiresAt: number; // epoch ms
}

const buckets = new Map<string, Bucket>();

const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanupAt = 0;

function pruneStale(now: number) {
  for (const [k, b] of buckets) {
    if (b.expiresAt <= now) buckets.delete(k);
  }
}

export interface RateLimitResult {
  /** true = 放行；false = 已达上限，应拒绝（调用方应返回 429 等） */
  ok: boolean;
  /** 距离该 bucket 重置还剩多少毫秒；ok=true 时为 0 */
  retryAfter: number;
}

/**
 * 对给定 key 做固定窗口限流检查。
 *
 * - 未达上限：count +1，返回 { ok: true, retryAfter: 0 }
 * - 已达上限：count 不变，返回 { ok: false, retryAfter: <剩余 ms> }
 *
 * @param key      限流维度键（如 `verify-email:email:${email}` / `verify-email:ip:${ip}`）
 * @param limit    窗口内允许的最大命中次数
 * @param windowMs 窗口长度（毫秒）
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();

  // 周期清理：cheap 时间检查，每分钟最多跑一次 pruneStale
  if (now - lastCleanupAt >= CLEANUP_INTERVAL_MS) {
    pruneStale(now);
    lastCleanupAt = now;
  }

  const existing = buckets.get(key);

  // 懒过期：桶不存在或已过期 -> 重开窗口
  if (!existing || existing.expiresAt <= now) {
    buckets.set(key, { count: 1, expiresAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  if (existing.count < limit) {
    existing.count += 1;
    return { ok: true, retryAfter: 0 };
  }

  // 达到上限：不递增计数，返回剩余时间
  return { ok: false, retryAfter: existing.expiresAt - now };
}
