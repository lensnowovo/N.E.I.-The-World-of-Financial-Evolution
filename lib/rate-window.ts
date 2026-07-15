/**
 * 原子时间桶限流的窗口数学（契约 §11）。
 *
 * 纯函数，无 Prisma 依赖，便于离线单测 retry_after / bucketEnd 语义。
 *
 * - 固定窗口：windowStart = floor(now / windowMs) * windowMs
 * - bucketEnd = windowStart + windowMs   ← 桶真正结束，retryAfter 据此
 * - expiresAt = bucketEnd + cleanupBuffer ← 仅 Cron 清理用，不计入客户端等待
 */
export const CLEANUP_BUFFER_MS = 60_000;

export interface RateWindow {
  windowStart: Date;
  bucketEnd: Date;
  expiresAt: Date;
}

export function computeRateWindow(now: number, windowMs: number): RateWindow {
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const bucketEnd = new Date(windowStart.getTime() + windowMs);
  const expiresAt = new Date(bucketEnd.getTime() + CLEANUP_BUFFER_MS);
  return { windowStart, bucketEnd, expiresAt };
}

/**
 * 429 的 retryAfter（秒）：基于 bucketEnd，**不含**清理缓冲（B9）。
 */
export function retryAfterSeconds(bucketEnd: number, now: number): number {
  return Math.max(0, Math.ceil((bucketEnd - now) / 1000));
}
