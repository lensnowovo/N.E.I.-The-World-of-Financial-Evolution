import { cookies } from 'next/headers';
import {
  ADMIN_REAUTH_MAX_AGE_SECONDS,
  issueAdminReauthToken,
  verifyAdminReauthToken,
} from '@/lib/admin-reauth-token';

const COOKIE_NAME = 'pevc_admin_reauth';

export async function setRecentAdminAuth(uid: number): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, issueAdminReauthToken(uid), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ADMIN_REAUTH_MAX_AGE_SECONDS,
  });
}

export async function clearRecentAdminAuth(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getRecentAdminAuth(uid: number): Promise<{ recent: boolean; expiresAt: string | null }> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value) return { recent: false, expiresAt: null };

  const result = verifyAdminReauthToken(value, uid);
  if (!result.valid) return { recent: false, expiresAt: null };
  return { recent: true, expiresAt: new Date(result.expiresAt).toISOString() };
}
