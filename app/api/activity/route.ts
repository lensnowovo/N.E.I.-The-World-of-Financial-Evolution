import { NextResponse } from 'next/server';
import { getSessionUid } from '@/lib/session';
import { ACTIVITY_EVENT, normalizeAnonymousId, trackActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

const PUBLIC_EVENT_TYPES = new Set<string>([
  ACTIVITY_EVENT.PAGE_VIEW,
]);

function normalizePath(value: unknown): string {
  if (typeof value !== 'string') return '/';
  const path = value.trim();
  if (!path.startsWith('/')) return '/';
  return path.slice(0, 120);
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const type = typeof body.type === 'string' ? body.type : '';
  if (!PUBLIC_EVENT_TYPES.has(type)) {
    return NextResponse.json({ error: 'unsupported_event' }, { status: 400 });
  }

  const path = normalizePath(body.path);
  const uid = await getSessionUid();
  const anonymousId = normalizeAnonymousId(body.anonymousId);

  trackActivity({
    type,
    userId: uid,
    anonymousId,
    source: 'web',
    metadata: {
      path,
      referrer: typeof body.referrer === 'string' ? body.referrer.slice(0, 120) : null,
    },
  });

  return NextResponse.json({ ok: true });
}
