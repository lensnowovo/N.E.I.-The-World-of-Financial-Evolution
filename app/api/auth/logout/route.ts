import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/session';
import { clearRecentAdminAuth } from '@/lib/admin-reauth';

export async function POST() {
  await Promise.all([clearSession(), clearRecentAdminAuth()]);
  return NextResponse.json({ ok: true });
}
