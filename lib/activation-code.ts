/**
 * Memory Node 一次性激活码（契约 §5.1 / §5.2.1）。
 *
 * - 8 位 Crockford Base32（去除 I/L/O/U，~40 bit 熵），大小写不敏感。
 * - 网站只存 SHA-256(code.toUpperCase()) 的 hex；明文仅在生成时返回一次。
 *
 * 纯函数模块，仅依赖 node:crypto，不引入 Prisma（便于离线单测）。
 */
import { createHash, randomBytes } from 'node:crypto';

// Crockford Base32 字母表：0-9 + 去除 I/L/O/U 的 22 个字母 = 32 个符号。
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

// 与 CROCKFORD 等价的字符集正则（用于输入校验，大小写不敏感）。
// 0-9, A-H, J, K, M, N, P-T, V-Z。
const CODE_RE = /^[0-9A-HJKMNP-TV-Z]{8}$/;

/**
 * 生成一个 8 位 Crockford Base32 激活码。40 bit 熵来自 crypto.randomBytes。
 */
export function generateActivationCode(): string {
  const bytes = randomBytes(5); // 40 bit
  let value = 0n;
  for (const b of bytes) {
    value = (value << 8n) | BigInt(b);
  }
  // 40 bit 正好拆成 8 组 5 bit（从最高位到最低位）。
  let out = '';
  for (let i = 0; i < 8; i++) {
    const shift = BigInt((7 - i) * 5);
    const idx = Number((value >> shift) & 31n);
    out += CROCKFORD[idx];
  }
  return out;
}

/**
 * 计算激活码的存储哈希：SHA-256(code.toUpperCase()) hex。
 * 大写化保证用户输入大小写不敏感。
 */
export function hashActivationCode(code: string): string {
  return createHash('sha256')
    .update((code ?? '').toUpperCase(), 'utf8')
    .digest('hex');
}

/**
 * 校验激活码格式：8 位 Crockford Base32，大小写不敏感。
 */
export function isValidCodeFormat(code: string): boolean {
  return typeof code === 'string' && CODE_RE.test(code.toUpperCase());
}
