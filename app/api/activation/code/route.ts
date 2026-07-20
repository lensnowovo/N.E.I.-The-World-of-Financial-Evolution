import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUid } from '@/lib/session';
import { checkAndConsume, getClientIp } from '@/lib/rate-limit';
import { generateActivationCode, hashActivationCode, isValidCodeFormat } from '@/lib/activation-code';

/** 5 分钟有效。 */
const CODE_TTL_MS = 5 * 60 * 1000;

/** 允许激活 Memory Node 的权益计划。 */
const ALLOWED_PLANS = ['memory-node-pro', 'memory-node-team'];

/** 用户维度发码限流（P2-3）：防止切换 IP 大量发码。5 次 / 10 分钟。 */
const USER_CODE_LIMIT = 5;
const USER_CODE_WINDOW_MS = 10 * 60 * 1000;

function rateLimited(retryAfter: number) {
  return NextResponse.json(
    { error: 'RATE_LIMITED', retry_after: retryAfter },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}

/**
 * POST /api/activation/code
 * 生成一次性激活码。需要网站 cookie session。仅存 SHA-256 哈希，明文只返回一次。
 * 契约 §5.1。
 */
export async function POST(req: Request) {
  const uid = await getSessionUid();
  if (uid == null) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  // 权益检查：仅允许 Memory Node 付费计划且有效（status=active 且未过期）的账号发码。
  const entitlement = await prisma.entitlement.findUnique({ where: { userId: uid } });
  if (!entitlement || !ALLOWED_PLANS.includes(entitlement.plan)) {
    return NextResponse.json({ error: 'NO_ENTITLEMENT' }, { status: 403 });
  }
  if (entitlement.status !== 'active') {
    return NextResponse.json({ error: 'ENTITLEMENT_EXPIRED' }, { status: 403 });
  }
  if (entitlement.expiresAt && entitlement.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'ENTITLEMENT_EXPIRED' }, { status: 403 });
  }

  // 限流（双维度，原子桶，契约 §11 + P2-3）：
  //   1) IP 维度：3 次 / 60s
  //   2) 用户维度：5 次 / 10min —— subject="user:<uid>"，语义清晰，不伪装成 IP
  const ip = getClientIp(req);
  const ipRl = await checkAndConsume({
    subject: ip,
    ip,
    endpoint: 'code',
    limit: 3,
    windowMs: 60_000,
  });
  if (!ipRl.allowed) return rateLimited(ipRl.retryAfter);

  const userRl = await checkAndConsume({
    subject: `user:${uid}`,
    endpoint: 'code:user',
    limit: USER_CODE_LIMIT,
    windowMs: USER_CODE_WINDOW_MS,
  });
  if (!userRl.allowed) return rateLimited(userRl.retryAfter);

  const code = generateActivationCode();
  if (!isValidCodeFormat(code)) {
    // 生成器理论上不会产出非法码；防御性兜底。
    return NextResponse.json({ error: 'CODE_GEN_FAILED' }, { status: 500 });
  }
  const codeHash = hashActivationCode(code);
  await prisma.activationCode.create({
    data: {
      codeHash,
      userId: uid,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });

  return NextResponse.json({ code, expires_in: 300 });
}
