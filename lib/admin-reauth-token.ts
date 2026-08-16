import crypto from 'node:crypto';
import { SESSION_SECRET } from '@/lib/secret';

export const ADMIN_REAUTH_MAX_AGE_SECONDS = 15 * 60;

const REAUTH_KEY = crypto
  .createHmac('sha256', SESSION_SECRET)
  .update('nei:admin-reauth:v1')
  .digest();

type AdminReauthPayload = {
  uid: number;
  exp: number;
  purpose: 'admin-reauth';
};

function sign(payload: string): string {
  return crypto.createHmac('sha256', REAUTH_KEY).update(payload).digest('base64url');
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function issueAdminReauthToken(uid: number, now = Date.now()): string {
  const payload: AdminReauthPayload = {
    uid,
    exp: now + ADMIN_REAUTH_MAX_AGE_SECONDS * 1000,
    purpose: 'admin-reauth',
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

export function verifyAdminReauthToken(
  token: string,
  expectedUid: number,
  now = Date.now(),
): { valid: true; expiresAt: number } | { valid: false } {
  const [encoded, signature, extra] = token.split('.');
  if (!encoded || !signature || extra || !safeEqual(sign(encoded), signature)) {
    return { valid: false };
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Partial<AdminReauthPayload>;
    if (
      payload.purpose !== 'admin-reauth'
      || payload.uid !== expectedUid
      || typeof payload.exp !== 'number'
      || !Number.isFinite(payload.exp)
      || payload.exp <= now
    ) {
      return { valid: false };
    }
    return { valid: true, expiresAt: payload.exp };
  } catch {
    return { valid: false };
  }
}
