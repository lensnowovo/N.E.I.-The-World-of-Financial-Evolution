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
 *
 * 另提供 `checkAndConsume`：基于 RateLimitBucket 表的**原子时间桶**限流
 * （契约 §11），用于 Memory Node 激活相关端点（需要跨实例一致、并发安全）。
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db';
import { computeRateWindow, retryAfterSeconds } from '@/lib/rate-window';
import { getClientIp as resolveClientIp } from '@/lib/client-ip';

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

/**
 * 从 Request headers 解析客户端 IP。委托给 lib/client-ip（仅信任 Vercel 注入头，
 * 只接受合法 IPv4/IPv6 单值；非法/超长/多段伪造值一律回退 'unknown'）。
 * 保留 `getClientIp(req)` 签名以兼容既有调用方（verify-email 等）。
 */
export function getClientIp(req: Request): string {
  return resolveClientIp(req.headers);
}

// ---------------------------------------------------------------------------
// 原子时间桶限流（契约 §11）—— Memory Node 激活端点专用。
// ---------------------------------------------------------------------------

export interface CheckAndConsumeArgs {
  /** 限流主体：合法 IP 或 "user:<id>"。作为原子桶冲突键的一部分。 */
  subject: string;
  /** 可选：原始 IP，仅写入 ip 列用于观测/日志（不影响计数）。 */
  ip?: string;
  endpoint: string; // "code" | "activate" | "refresh" | "code:user"
  limit: number;
  windowMs: number;
}

export interface CheckAndConsumeResult {
  allowed: boolean;
  /** 秒；allowed=true 时为 0 */
  retryAfter: number;
}

/**
 * 原子固定窗口计数：INSERT 新桶(count=1) 或 ON CONFLICT 自增，RETURNING 自增后的 count。
 * 单语句完成读-改-写，由 ON CONFLICT 的行锁串行化同一桶上的并发，无 count→create 竞态。
 *
 * @param args   限流维度与阈值
 * @param client 默认全局 prisma；集成测试可传入连到一次性库的 PrismaClient
 */
export async function checkAndConsume(
  args: CheckAndConsumeArgs,
  client: PrismaClient | Prisma.TransactionClient = prisma
): Promise<CheckAndConsumeResult> {
  const now = Date.now();
  const { windowStart, bucketEnd, expiresAt } = computeRateWindow(now, args.windowMs);
  const obsIp = args.ip ?? null;

  const rows = await client.$queryRaw<Array<{ new_count: bigint }>>`
    INSERT INTO "RateLimitBucket"
      ("subject", "ip", "endpoint", "windowStart", "count", "expiresAt", "createdAt")
    VALUES (${args.subject}, ${obsIp}, ${args.endpoint}, ${windowStart}, 1, ${expiresAt}, ${new Date(now)})
    ON CONFLICT ("subject", "endpoint", "windowStart")
    DO UPDATE SET "count" = "RateLimitBucket"."count" + 1
    RETURNING "count" AS new_count
  `;
  const newCount = Number(rows[0]?.new_count ?? 0);
  if (newCount > args.limit) {
    // retryAfter 基于 bucketEnd，不含 60s 清理缓冲（B9）。
    return { allowed: false, retryAfter: retryAfterSeconds(bucketEnd.getTime(), now) };
  }
  return { allowed: true, retryAfter: 0 };
}
