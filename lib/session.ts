import { cookies } from 'next/headers';
import crypto from 'crypto';
import { prisma } from './db';

// 简单的 HMAC 签名 cookie session（MVP 自实现，避免引入额外依赖）
// payload: { uid, exp }
const SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'pevc_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 天

function sign(payload: string) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}

function encode(uid: number) {
  const data = JSON.stringify({ uid, exp: Date.now() + MAX_AGE * 1000 });
  const b64 = Buffer.from(data).toString('base64url');
  const sig = sign(b64);
  return `${b64}.${sig}`;
}

function decode(token: string): { uid: number; exp: number } | null {
  const [b64, sig] = token.split('.');
  if (!b64 || !sig) return null;
  if (sign(b64) !== sig) return null;
  try {
    const data = JSON.parse(Buffer.from(b64, 'base64url').toString());
    if (typeof data.uid !== 'number' || typeof data.exp !== 'number') return null;
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export async function setSession(uid: number) {
  const token = encode(uid);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function clearSession() {
  cookies().delete(COOKIE_NAME);
}

export async function getSessionUid(): Promise<number | null> {
  const c = cookies().get(COOKIE_NAME);
  if (!c?.value) return null;
  const d = decode(c.value);
  return d?.uid ?? null;
}

export async function getCurrentUser() {
  const uid = await getSessionUid();
  if (!uid) return null;
  return prisma.user.findUnique({
    where: { id: uid },
    select: {
      id: true,
      email: true,
      nickname: true,
      role: true,
      avatarUrl: true,
      institution: true,
      bio: true,
      createdAt: true,
    },
  });
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
