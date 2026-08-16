import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getClientIpFromRequest } from '@/lib/client-ip';

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function writeAdminAudit(input: {
  actorUserId: number;
  action: string;
  entityType: string;
  entityId: string | number;
  reason?: string | null;
  beforeState?: Prisma.InputJsonValue;
  afterState?: Prisma.InputJsonValue;
  request?: Request;
  client?: DbClient;
}) {
  const client = input.client ?? prisma;
  const ip = input.request ? getClientIpFromRequest(input.request) : 'unknown';
  await client.adminAuditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: String(input.entityId),
      reason: input.reason?.trim().slice(0, 500) || null,
      beforeState: input.beforeState,
      afterState: input.afterState,
      ipAddress: ip === 'unknown' ? null : ip,
      userAgent: input.request?.headers.get('user-agent')?.slice(0, 512) || null,
    },
  });
}
