import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAndConsume, getClientIp } from '@/lib/rate-limit';
import { isValidCodeFormat } from '@/lib/activation-code';
import { ActivationError, performActivation } from '@/lib/activation';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const PLATFORMS = new Set(['windows', 'macos']);

interface ActivateBody {
  code?: unknown;
  device_id?: unknown;
  device_name?: unknown;
  platform?: unknown;
  client_version?: unknown;
}

/**
 * POST /api/activation/activate
 * 用激活码换 Ed25519 签名许可证。**不需要 cookie session**（契约 §5.2）。
 */
export async function POST(req: Request) {
  let body: ActivateBody;
  try {
    body = (await req.json()) as ActivateBody;
  } catch {
    return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });
  }

  // 限流优先（原子桶）。契约 §5.2：activate 10 次 / 60s。
  const ip = getClientIp(req);
  const rl = await checkAndConsume({
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

  // 输入校验。
  const code = typeof body.code === 'string' ? body.code : '';
  const deviceId = typeof body.device_id === 'string' ? body.device_id : '';
  const deviceName = typeof body.device_name === 'string' ? body.device_name : '';
  const platform = typeof body.platform === 'string' ? body.platform : '';
  const clientVersion =
    typeof body.client_version === 'string' ? body.client_version : '';

  if (!isValidCodeFormat(code)) {
    return NextResponse.json({ error: 'INVALID_CODE' }, { status: 400 });
  }
  if (!UUID_RE.test(deviceId) || !deviceName || !PLATFORMS.has(platform) || !SEMVER_RE.test(clientVersion)) {
    return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });
  }

  // 激活事务（契约 §5.2.1）。
  let result;
  try {
    result = await performActivation(
      { code, deviceId, deviceName, platform, clientVersion },
      prisma
    );
  } catch (err) {
    if (err instanceof ActivationError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    // 未预期错误（如私钥缺失）。不泄露细节。
    console.error('activation failed', err);
    return NextResponse.json({ error: 'ACTIVATION_UNAVAILABLE' }, { status: 500 });
  }

  const user = await prisma.user.findUnique({
    where: { id: result.userId },
    select: { nickname: true },
  });

  return NextResponse.json({
    license: result.license,
    expires_at: new Date(result.exp * 1000).toISOString(),
    user: { nickname: user?.nickname ?? '', plan: result.plan },
  });
}
