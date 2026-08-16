import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRecentAdmin } from '@/lib/auth-guard';
import { writeAdminAudit } from '@/lib/admin-audit';
import { parseMemoryTrialGrant } from '@/lib/memory-entitlement';

export const dynamic = 'force-dynamic';

const DAY_MS = 86_400_000;

/**
 * POST /api/admin/memory-entitlements
 *
 * Grants a time-limited, revocable Memory Node trial to an existing N.E.I. user.
 * This endpoint never creates users and never receives Memory Node content.
 */
export async function POST(req: Request) {
  const guard = await requireRecentAdmin();
  if (guard instanceof NextResponse) return guard;

  const input = parseMemoryTrialGrant(await req.json().catch(() => null));
  if (!input) {
    return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, email: true, nickname: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
  }

  const existing = await prisma.entitlement.findUnique({
    where: { userId: user.id },
    select: { plan: true, source: true },
  });
  if (
    existing?.plan === 'memory-node-team'
    || (existing?.plan === 'memory-node-pro' && existing.source !== 'admin-trial')
  ) {
    return NextResponse.json({ error: 'ENTITLEMENT_MANAGED' }, { status: 409 });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + input.days * DAY_MS);
  const metadata = JSON.stringify({
    kind: 'internal-trial',
    grantedBy: guard.user.id,
    grantedAt: now.toISOString(),
    days: input.days,
  });

  const entitlement = await prisma.$transaction(async (tx) => {
    const result = await tx.entitlement.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        plan: 'memory-node-pro',
        status: 'active',
        startedAt: now,
        expiresAt,
        source: 'admin-trial',
        metadata,
      },
      update: {
        plan: 'memory-node-pro',
        status: 'active',
        startedAt: now,
        expiresAt,
        source: 'admin-trial',
        metadata,
      },
      select: { plan: true, status: true, expiresAt: true },
    });
    await writeAdminAudit({
      actorUserId: guard.user.id,
      action: 'memory.entitlement.grant-trial',
      entityType: 'user',
      entityId: user.id,
      beforeState: existing ?? undefined,
      afterState: {
        plan: result.plan,
        status: result.status,
        expiresAt: result.expiresAt?.toISOString() ?? null,
      },
      request: req,
      client: tx,
    });
    return result;
  });

  return NextResponse.json({
    user: { email: user.email, nickname: user.nickname },
    entitlement: {
      plan: entitlement.plan,
      status: entitlement.status,
      expiresAt: entitlement.expiresAt?.toISOString() ?? null,
    },
  });
}
