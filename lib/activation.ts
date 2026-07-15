/**
 * Memory Node 激活事务核心（契约 §5.2.1）。
 *
 * 把「激活码 → 许可证」的并发安全事务抽成纯 DB 操作函数 performActivation，
 * 路由层只负责鉴权/限流/输入校验/响应格式化；集成测试可直接对一次性库调用。
 *
 * 串行化关键（见契约 §5.2.2）：
 * 1. 事务显式 ReadCommitted。
 * 2. 锁该用户唯一的 Entitlement 行（FOR UPDATE）→ 同一用户并发激活在此串行。
 * 3. 获锁后**重读** ActivationCode → 同码并发第二笔看到第一笔已提交的 consumedAt。
 * 4. 消费用条件原子 UPDATE（consumedAt IS NULL AND expiresAt>now RETURNING）→ 防御纵深。
 */
import type { PrismaClient } from '@prisma/client';
import { issueLicense } from '@/lib/activation-license';
import { hashActivationCode } from '@/lib/activation-code';

/** 激活流程稳定错误码（契约 §7）。 */
export class ActivationError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string
  ) {
    super(code);
    this.name = 'ActivationError';
  }
}

/** 允许激活 Memory Node 的权益计划。 */
const ALLOWED_PLANS = ['memory-node-pro', 'memory-node-team'];

/** 设备上限。 */
export const DEVICE_LIMIT = 3;

/**
 * 轻量 semver 「小于」比较（仅 x.y.z）。client_version < minVersion → true。
 * 非法版本视为最小（保守拒绝过旧客户端时由调用方保证格式已校验）。
 */
export function semverLt(a: string, b: string): boolean {
  const pa = (a || '').split('.').map((n) => Number.parseInt(n, 10));
  const pb = (b || '').split('.').map((n) => Number.parseInt(n, 10));
  for (let i = 0; i < 3; i++) {
    const ai = Number.isFinite(pa[i]) ? pa[i] : 0;
    const bi = Number.isFinite(pb[i]) ? pb[i] : 0;
    if (ai !== bi) return ai < bi;
  }
  return false;
}

export interface PerformActivationInput {
  code: string;
  deviceId: string;
  deviceName: string;
  platform: string;
  clientVersion: string;
}

export interface PerformActivationResult {
  license: string;
  exp: number; // epoch 秒
  userId: number;
  plan: string;
}

/**
 * 在给定 client 上执行完整激活事务。client 默认为全局 prisma；测试可传入一次性库。
 * 抛 ActivationError（带 status/code）由路由层映射为 HTTP 响应。
 */
export async function performActivation(
  input: PerformActivationInput,
  client: PrismaClient
): Promise<PerformActivationResult> {
  const codeHash = hashActivationCode(input.code);

  const issued = await client.$transaction(
    async (tx) => {
      // (a) 初次读码：仅取 userId + 早期快速失败（非权威）。
      const codeRow = await tx.activationCode.findUnique({ where: { codeHash } });
      if (!codeRow) throw new ActivationError(400, 'INVALID_CODE');

      // (b) 锁该用户唯一的 Entitlement 行（per-user 串行化点）。
      //     Prisma 不直接暴露 FOR UPDATE，用参数化 $queryRaw（禁止拼接）。
      const ents = await tx.$queryRaw<
        Array<{ id: number; plan: string; status: string; expiresAt: Date | null }>
      >`SELECT id, plan, status, "expiresAt" FROM "Entitlement"
        WHERE "userId" = ${codeRow.userId} FOR UPDATE`;
      const ent = ents[0];
      if (!ent) throw new ActivationError(403, 'NO_ENTITLEMENT');
      if (!ALLOWED_PLANS.includes(ent.plan))
        throw new ActivationError(403, 'NO_ENTITLEMENT');
      if (ent.status !== 'active')
        throw new ActivationError(403, 'ENTITLEMENT_EXPIRED');
      if (ent.expiresAt && ent.expiresAt.getTime() <= Date.now())
        throw new ActivationError(403, 'ENTITLEMENT_EXPIRED');

      // (b2) 权威重校验激活码：持锁后新快照。同码并发第二笔在此看到已提交的 consumedAt。
      const codeFresh = await tx.activationCode.findUnique({ where: { codeHash } });
      if (!codeFresh) throw new ActivationError(400, 'INVALID_CODE');
      if (codeFresh.expiresAt.getTime() < Date.now())
        throw new ActivationError(400, 'CODE_EXPIRED');
      if (codeFresh.consumedAt) throw new ActivationError(400, 'CODE_CONSUMED');

      // (c) 版本门
      const release = await tx.releaseManifest.findFirst({
        where: { product: 'memory-node', platform: input.platform, isLatest: true },
      });
      if (release?.minVersion && semverLt(input.clientVersion, release.minVersion))
        throw new ActivationError(403, 'CLIENT_TOO_OLD');

      // (d) 设备计数：持锁后执行。不含本 deviceId；被撤销设备 status≠active 自然不计入。
      const activeCount = await tx.deviceActivation.count({
        where: {
          userId: codeRow.userId,
          status: 'active',
          deviceId: { not: input.deviceId },
        },
      });
      if (activeCount >= DEVICE_LIMIT)
        throw new ActivationError(403, 'DEVICE_LIMIT_EXCEEDED');

      // (e) 原子消费激活码（条件 UPDATE，0 行回查区分 CONSUMED/EXPIRED）。
      const now = new Date();
      const consumed = await tx.$queryRaw<
        Array<{ id: number }>
      >`UPDATE "ActivationCode"
         SET "consumedAt" = ${now}, "deviceId" = ${input.deviceId}
         WHERE id = ${codeFresh.id}
           AND "consumedAt" IS NULL
           AND "expiresAt" > ${now}
         RETURNING id`;
      if (consumed.length === 0) {
        const probe = await tx.activationCode.findUnique({
          where: { id: codeFresh.id },
        });
        if (probe?.consumedAt) throw new ActivationError(400, 'CODE_CONSUMED');
        throw new ActivationError(400, 'CODE_EXPIRED');
      }

      // (e2) upsert 设备（失败则整笔事务回滚，含消费）
      await tx.deviceActivation.upsert({
        where: {
          userId_deviceId: { userId: codeRow.userId, deviceId: input.deviceId },
        },
        create: {
          userId: codeRow.userId,
          deviceId: input.deviceId,
          deviceName: input.deviceName,
          platform: input.platform,
          clientVersion: input.clientVersion,
          status: 'active',
        },
        update: {
          deviceName: input.deviceName,
          platform: input.platform,
          clientVersion: input.clientVersion,
          status: 'active',
          lastSeenAt: new Date(),
          revokedAt: null,
          revokeReason: null,
        },
      });

      // (f) 签发许可证：exp = min(iat+30d, ee)
      const r = issueLicense({
        uid: codeRow.userId,
        did: input.deviceId,
        ent: ent.plan,
        entitlementExpiresAt: ent.expiresAt,
        vmin: release?.minVersion ?? '0.0.1',
      });
      return { ...r, userId: codeRow.userId, plan: ent.plan };
    },
    { isolationLevel: 'ReadCommitted' }
  );

  return issued;
}
