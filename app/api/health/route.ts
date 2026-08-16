import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 5;

const TIMEOUT_MS = 2_500;

function validMonitorToken(req: Request): boolean {
  const expected = process.env.HEALTHCHECK_TOKEN;
  const authorization = req.headers.get('authorization');
  const provided = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!expected || !provided) return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function GET(req: Request) {
  if (!validMonitorToken(req)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const startedAt = Date.now();
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), TIMEOUT_MS)),
    ]);
    return NextResponse.json(
      { status: 'ok', database: 'reachable', latencyMs: Date.now() - startedAt },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch {
    return NextResponse.json(
      { status: 'degraded', database: 'unreachable' },
      { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  }
}
