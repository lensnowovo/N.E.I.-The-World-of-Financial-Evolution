import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAndConsume, getClientIp } from '@/lib/rate-limit';
import { ActivationError, performActivation } from '@/lib/activation';
import { validateActivationInput } from '@/lib/activation-input';

/**
 * POST /api/activation/activate
 * 用激活码换 Ed25519 签名许可证。**不需要 cookie session**（契约 §5.2）。
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });
  }

  // 限流优先（原子桶，subject=合法 IP）。契约 §5.2：activate 10 次 / 60s。
  const ip = getClientIp(req);
  const rl = await checkAndConsume({
    subject: ip,
    ip,
    endpoint: 'activate',
    limit: 10,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'RATE_LIMITED', retry_after: rl.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  // 输入校验 + 长度/控制字符限制（P2-1）。
  const input = validateActivationInput(body);
  if (!input) {
    return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });
  }

  // 激活事务（契约 §5.2.1）。
  let result;
  try {
    result = await performActivation(input, prisma);
  } catch (err) {
    if (err instanceof ActivationError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    // 未预期错误（如私钥缺失）。不泄露细节。
    console.error('activation failed', err);
    return NextResponse.json({ error: 'ACTIVATION_UNAVAILABLE' }, { status: 500 });
  }

  // P1-3：nickname 已在事务内读取，随结果返回；无事务后查询，杜绝「已激活却 500」。
  return NextResponse.json({
    license: result.license,
    expires_at: new Date(result.exp * 1000).toISOString(),
    user: { nickname: result.nickname, plan: result.plan },
  });
}
