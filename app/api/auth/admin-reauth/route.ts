import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-guard';
import { getRecentAdminAuth, setRecentAdminAuth } from '@/lib/admin-reauth';
import { writeAdminAudit } from '@/lib/admin-audit';
import { checkAndConsume } from '@/lib/rate-limit';
import { getClientIpFromRequest } from '@/lib/client-ip';

export const dynamic = 'force-dynamic';

const WINDOW_MS = 15 * 60 * 1000;

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  return NextResponse.json(await getRecentAdminAuth(guard.user.id), {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const ip = getClientIpFromRequest(req);
  const [userLimit, ipLimit] = await Promise.all([
    checkAndConsume({
      subject: `user:${guard.user.id}`,
      ip,
      endpoint: 'auth:admin-reauth:user',
      limit: 5,
      windowMs: WINDOW_MS,
    }),
    checkAndConsume({
      subject: `ip:${ip}`,
      ip,
      endpoint: 'auth:admin-reauth:ip',
      limit: 20,
      windowMs: WINDOW_MS,
    }),
  ]);
  if (!userLimit.allowed || !ipLimit.allowed) {
    return NextResponse.json(
      { error: '验证尝试过于频繁，请稍后再试', code: 'RATE_LIMITED' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.max(userLimit.retryAfter, ipLimit.retryAfter, 1)) },
      },
    );
  }

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!password || password.length > 128) {
    return NextResponse.json({ error: '请输入当前登录密码', code: 'INVALID_REQUEST' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: guard.user.id },
    select: { passwordHash: true },
  });
  if (!user?.passwordHash) {
    return NextResponse.json(
      { error: '当前账号尚未设置密码，请先在账号设置中设置密码', code: 'PASSWORD_REQUIRED' },
      { status: 409 },
    );
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await writeAdminAudit({
      actorUserId: guard.user.id,
      action: 'admin.reauth.failed',
      entityType: 'admin-session',
      entityId: guard.user.id,
      request: req,
    });
    return NextResponse.json({ error: '密码错误', code: 'INVALID_CREDENTIALS' }, { status: 401 });
  }

  await setRecentAdminAuth(guard.user.id);
  await writeAdminAudit({
    actorUserId: guard.user.id,
    action: 'admin.reauth.succeeded',
    entityType: 'admin-session',
    entityId: guard.user.id,
    request: req,
  });
  return NextResponse.json({ ok: true, expiresInSeconds: 15 * 60 });
}
