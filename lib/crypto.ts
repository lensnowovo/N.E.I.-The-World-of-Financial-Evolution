import crypto from 'node:crypto';

/**
 * API key 加密存储。
 *
 * 用 AES-256-GCM 对称加密。密钥从 SESSION_SECRET 经 scrypt 派生（32 字节）。
 * 密文格式：base64(iv) + ':' + base64(authTag) + ':' + base64(ciphertext)
 */

const SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
const KEY = crypto.scryptSync(SECRET, 'nei-exec-key', 32);

export function encryptApiKey(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}

export function decryptApiKey(enc: string): string {
  const [ivB64, tagB64, dataB64] = enc.split(':');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Invalid encrypted key format');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
