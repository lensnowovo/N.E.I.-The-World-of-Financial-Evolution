import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Cron 清理（契约 §11 清理 + P2-4 ActivationCode 保留期清理）。
 *
 * 触发：Vercel Cron 每 10 分钟（vercel.json crons）。Vercel 以
 *   Authorization: Bearer <CRON_SECRET> 调用；未配置 CRON_SECRET 或不匹配 → 401。
 *
 * 删除：
 *   - RateLimitBucket.expiresAt < now
 *   - ActivationCode.expiresAt < now - 保留期（默认 7 天）
 *     （仍有效/未过保留期的激活码一律保留；只清长期过期的）
 *
 * 只返回删除数量，不暴露数据库错误或敏感信息。
 */

/** 过期激活码的保留期（审计/排障），超过后才清理。 */
const ACTIVATION_CODE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const VERIFICATION_CODE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const SECURITY_LOG_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;
const RAW_METRIC_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

function unauthorized() {
  return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
}

async function runCleanup() {
  const now = new Date();
  const codeCutoff = new Date(now.getTime() - ACTIVATION_CODE_RETENTION_MS);
  const verificationCutoff = new Date(now.getTime() - VERIFICATION_CODE_RETENTION_MS);
  const logCutoff = new Date(now.getTime() - SECURITY_LOG_RETENTION_MS);
  const metricCutoff = new Date(now.getTime() - RAW_METRIC_RETENTION_MS);

  const [buckets, codes, verificationCodes, mcpLogs, activityEvents, metricSamples] = await Promise.all([
    prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.activationCode.deleteMany({ where: { expiresAt: { lt: codeCutoff } } }),
    prisma.verificationCode.deleteMany({ where: { createdAt: { lt: verificationCutoff } } }),
    prisma.mcpCallLog.deleteMany({ where: { createdAt: { lt: logCutoff } } }),
    prisma.activityEvent.deleteMany({ where: { createdAt: { lt: logCutoff } } }),
    prisma.metricSample.deleteMany({ where: { createdAt: { lt: metricCutoff } } }),
  ]);

  return NextResponse.json({
    rate_limit_buckets_deleted: buckets.count,
    activation_codes_deleted: codes.count,
    verification_codes_deleted: verificationCodes.count,
    mcp_call_logs_deleted: mcpLogs.count,
    activity_events_deleted: activityEvents.count,
    metric_samples_deleted: metricSamples.count,
  });
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // 未配置 CRON_SECRET 时一律拒绝（避免公开端点被随意触发）。
  if (!secret) return false;
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return false;
  // 定时比较，避免时序侧信道。
  return token.length === secret.length && timingSafeEqual(token, secret);
}

function timingSafeEqual(a: string, b: string): boolean {
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return unauthorized();
  try {
    return await runCleanup();
  } catch (err) {
    // 不泄露数据库错误细节。
    console.error('cleanup-rate-limits failed', err);
    return NextResponse.json({ error: 'CLEANUP_FAILED' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // 同时支持 POST（手动/未来调度兼容）。
  if (!isAuthorized(req)) return unauthorized();
  try {
    return await runCleanup();
  } catch (err) {
    console.error('cleanup-rate-limits failed', err);
    return NextResponse.json({ error: 'CLEANUP_FAILED' }, { status: 500 });
  }
}
