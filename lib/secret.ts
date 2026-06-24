/**
 * 共享的 SESSION_SECRET 解析（lib/session.ts 与 lib/crypto.ts 共用）。
 *
 * 在生产环境（NODE_ENV === 'production'）下，若 SESSION_SECRET 未设置或仍为默认 dev 值，
 * 立即抛错 —— 避免 session cookie / API-key 加密密钥可被伪造。
 *
 * 开发环境仍允许使用默认 secret 以保持本地可跑。
 */

const DEFAULT_DEV_SECRET = 'dev-secret-change-me';

function resolveSecret(): string {
  const raw = process.env.SESSION_SECRET;
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    if (!raw) {
      throw new Error(
        'SESSION_SECRET must be set in production. The cookie/MAC signing key and API-key encryption key are derived from it.'
      );
    }
    if (raw === DEFAULT_DEV_SECRET) {
      throw new Error(
        'SESSION_SECRET must not be the default dev value in production. Set a unique, high-entropy secret.'
      );
    }
    return raw;
  }

  return raw || DEFAULT_DEV_SECRET;
}

export const SESSION_SECRET = resolveSecret();
