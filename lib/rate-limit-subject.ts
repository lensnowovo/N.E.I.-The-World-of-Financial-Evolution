import { createHash } from 'node:crypto';

/**
 * 为邮箱等可识别标识生成稳定、不可逆的限流主体。
 * prefix 保留用途可读性，原值不进入 RateLimitBucket。
 */
export function hashedRateLimitSubject(prefix: string, value: string): string {
  const digest = createHash('sha256').update(value).digest('hex');
  return `${prefix}:${digest}`;
}
