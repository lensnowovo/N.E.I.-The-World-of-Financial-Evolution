import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUid } from '@/lib/session';
import { checkAndConsume, getClientIp } from '@/lib/rate-limit';
import { generateActivationCode, hashActivationCode } from '@/lib/activation-code';

/** 5 分钟有效。 */
const CODE_TTL_MS = 5 * 60 * 1000;

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

  // 限流优先：保护端点负载。原子桶（契约 §11）。
  const ip = getClientIp(req);
  const rl = await checkAndConsume({ ip, endpoint: 'code', limit: 3, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'RATE_LIMITED', retry_after: rl.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  // 权益检查：仅允许 Memory Node 付费计划且有效（status=active 且未过期）的账号发码。
  const entitlement = await prisma.entitlement.findUnique({ where: { userId: uid } });
  if (
    !entitlement ||
    !['memory-node-pro', 'memory-node-team'].includes(entitlement.plan)
  ) {
    return NextResponse.json({ error: 'NO_ENTITLEMENT' }, { status: 403 });
  }
  if (entitlement.status !== 'active') {
    return NextResponse.json({ error: 'ENTITLEMENT_EXPIRED' }, { status: 403 });
  }
  if (entitlement.expiresAt && entitlement.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'ENTITLEMENT_EXPIRED' }, { status: 403 });
  }

  const code = generateActivationCode();
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
