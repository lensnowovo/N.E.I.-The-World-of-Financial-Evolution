import { NextResponse } from 'next/server';
import { getSessionUid } from '@/lib/session';
import { ACTIVITY_EVENT, normalizeAnonymousId, trackActivity } from '@/lib/activity';
import { prisma } from '@/lib/db';
import { checkAndConsume, checkRateLimit, getClientIp } from '@/lib/rate-limit';
import {
  activityActorSubject,
  activityPathFingerprint,
  MAX_ACTIVITY_BODY_BYTES,
  normalizeActivityPath,
  postIdFromActivityPath,
} from '@/lib/activity-ingest';
import { POST_STATUS } from '@/lib/status';

export const dynamic = 'force-dynamic';

const PUBLIC_EVENT_TYPES = new Set<string>([
  ACTIVITY_EVENT.PAGE_VIEW,
]);

const IP_LIMIT = 120;
const ACTOR_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;
const DEDUP_WINDOW_MS = 5 * 60_000;

export async function POST(req: Request) {
  const contentLength = Number(req.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_ACTIVITY_BODY_BYTES) {
    return NextResponse.json({ error: 'payload_too_large' }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    if (Buffer.byteLength(text, 'utf8') > MAX_ACTIVITY_BODY_BYTES) {
      return NextResponse.json({ error: 'payload_too_large' }, { status: 413 });
    }
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const type = typeof body.type === 'string' ? body.type : '';
  if (!PUBLIC_EVENT_TYPES.has(type)) {
    return NextResponse.json({ error: 'unsupported_event' }, { status: 400 });
  }

  const path = normalizeActivityPath(body.path);
  const uid = await getSessionUid();
  const anonymousId = normalizeAnonymousId(body.anonymousId);
  const ip = getClientIp(req);
  const actor = activityActorSubject(uid, anonymousId, ip);

  // 本机快速门：先挡住单实例上的明显洪泛，避免每个超限请求都访问数据库。
  const localRl = checkRateLimit(`activity:ip:${ip}`, IP_LIMIT, RATE_WINDOW_MS);
  if (!localRl.ok) {
    const retryAfter = Math.max(1, Math.ceil(localRl.retryAfter / 1000));
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  // 跨实例总量限制 + 访问者总量限制，防止伪造 anonymousId 绕过单一维度。
  const ipRl = await checkAndConsume({
    subject: `ip:${ip}`,
    ip,
    endpoint: 'activity:page-view:ip',
    limit: IP_LIMIT,
    windowMs: RATE_WINDOW_MS,
  });
  if (!ipRl.allowed) {
    const retryAfter = Math.max(ipRl.retryAfter, 1);
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  // IP 总量门禁通过后才创建访问者桶，避免伪造 anonymousId 制造无界高基数记录。
  const actorRl = await checkAndConsume({
    subject: actor,
    ip,
    endpoint: 'activity:page-view:actor',
    limit: ACTOR_LIMIT,
    windowMs: RATE_WINDOW_MS,
  });
  if (!actorRl.allowed) {
    const retryAfter = Math.max(actorRl.retryAfter, 1);
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  // 同一访问者对同一路径 5 分钟只落一次统计；重复导航直接成功返回，不污染数据。
  const dedup = await checkAndConsume({
    subject: actor,
    ip,
    endpoint: `activity:page:${activityPathFingerprint(path)}`,
    limit: 1,
    windowMs: DEDUP_WINDOW_MS,
  });
  if (!dedup.allowed) {
    return NextResponse.json({ ok: true, deduplicated: true });
  }

  // Await here so the serverless runtime cannot reclaim the request before the
  // accepted event is persisted. The helper absorbs analytics-only failures.
  await trackActivity({
    type,
    userId: uid,
    anonymousId,
    source: 'web',
    metadata: {
      path,
      referrer: typeof body.referrer === 'string' ? body.referrer.slice(0, 120) : null,
    },
  });

  // 浏览量只由经过上述限流与去重的真实页面上报更新，详情 GET 本身保持只读。
  const postId = postIdFromActivityPath(path);
  if (postId) {
    await prisma.post.updateMany({
      where: { id: postId, status: POST_STATUS.PUBLISHED, deletedAt: null },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {
      /* 浏览统计不能影响页面使用。 */
    });
  }

  return NextResponse.json({ ok: true });
}
