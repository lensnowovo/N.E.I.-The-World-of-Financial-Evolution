// Integration tests for the activation transaction + rate limit + cron cleanup.
// Run (throwaway DB only):
//   docker run ... postgres; apply canonical DDL (migrate diff --from-empty).
//   DATABASE_URL=<throwaway> TEST_DATABASE_URL=<throwaway> \
//     CRON_SECRET=test-cron-secret node --import tsx --test scripts/check-activation-concurrency.test.ts
//
// Gated on TEST_DATABASE_URL: when unset (CI) every test is skipped.
// NEVER run against production.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

import { generateActivationCode, hashActivationCode } from '../lib/activation-code';
import { ActivationError, performActivation } from '../lib/activation';
import { checkAndConsume } from '../lib/rate-limit';

const TEST_DB = process.env.TEST_DATABASE_URL;
const SKIP = !TEST_DB;

// License signing key: published non-production test vector (contract §18.3).
const TEST_PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIJjku/Q96QGT2fmm9Uqf5QDqXHV/tSzZjBP60OKSCDsV
-----END PRIVATE KEY-----`;

let client: PrismaClient;

test('setup: connect throwaway DB', { skip: SKIP }, async () => {
  process.env.MEMORY_LICENSE_PRIVATE_KEY = TEST_PRIVATE_KEY_PEM;
  process.env.CRON_SECRET = 'test-cron-secret';
  client = new PrismaClient({ datasources: { db: { url: TEST_DB } } });
  await client.$connect();
});

// ---- helpers ---------------------------------------------------------------

async function createUser() {
  const s = Math.random().toString(36).slice(2, 10);
  const user = await client.user.create({
    data: { email: `act-${s}@test.local`, nickname: `nick-${s}`, role: 'VC' },
  });
  await client.entitlement.create({
    data: { userId: user.id, plan: 'memory-node-pro', status: 'active', expiresAt: null },
  });
  return user;
}

async function createCode(userId: number): Promise<string> {
  const c = generateActivationCode();
  await client.activationCode.create({
    data: { codeHash: hashActivationCode(c), userId, expiresAt: new Date(Date.now() + 5 * 60_000) },
  });
  return c;
}

async function createDevice(userId: number, deviceId: string, status: 'active' | 'revoked') {
  await client.deviceActivation.create({
    data: {
      userId,
      deviceId,
      deviceName: deviceId,
      platform: 'windows',
      clientVersion: '0.1.0',
      status,
      ...(status === 'revoked' ? { revokedAt: new Date(), revokeReason: 'user_revoke' } : {}),
    },
  });
}

async function cleanupUser(userId: number) {
  await client.user.delete({ where: { id: userId } }).catch(() => undefined);
}

// ---- B1: device-limit concurrency ------------------------------------------

test('device limit: two concurrent activations -> exactly one succeeds (B1)', { skip: SKIP }, async () => {
  const user = await createUser();
  await createDevice(user.id, 'd1', 'active');
  await createDevice(user.id, 'd2', 'active');
  const c1 = await createCode(user.id);
  const c2 = await createCode(user.id);

  const results = await Promise.allSettled([
    performActivation({ code: c1, deviceId: 'd3', deviceName: 'd3', platform: 'windows', clientVersion: '0.1.0' }, client),
    performActivation({ code: c2, deviceId: 'd4', deviceName: 'd4', platform: 'windows', clientVersion: '0.1.0' }, client),
  ]);
  const ok = results.filter((r) => r.status === 'fulfilled');
  const bad = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
  assert.equal(ok.length, 1, `expected 1 success, got ${ok.length}`);
  assert.equal(bad.length, 1);
  assert.equal((bad[0].reason as ActivationError).code, 'DEVICE_LIMIT_EXCEEDED');
  const active = await client.deviceActivation.count({ where: { userId: user.id, status: 'active' } });
  assert.equal(active, 3);
  await cleanupUser(user.id);
});

// ---- B7: same-code concurrency ---------------------------------------------

test('same-code: concurrent consume -> 1 success + 1 CODE_CONSUMED (B7)', { skip: SKIP }, async () => {
  const user = await createUser();
  const c = await createCode(user.id);
  const results = await Promise.allSettled([
    performActivation({ code: c, deviceId: 'a1', deviceName: 'a', platform: 'windows', clientVersion: '0.1.0' }, client),
    performActivation({ code: c, deviceId: 'a2', deviceName: 'b', platform: 'windows', clientVersion: '0.1.0' }, client),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const bad = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
  assert.equal(bad.length, 1);
  assert.equal((bad[0].reason as ActivationError).code, 'CODE_CONSUMED');
  const rows = await client.activationCode.findMany({ where: { userId: user.id } });
  assert.equal(rows.length, 1);
  assert.ok(rows[0].consumedAt !== null);
  await cleanupUser(user.id);
});

// ---- B2: rate-limit atomicity (subject key) --------------------------------

test('rate-limit: 15 concurrent -> exactly 10 allowed (B2, subject key)', { skip: SKIP }, async () => {
  const subject = `ip-${Math.random().toString(36).slice(2, 8)}`;
  const results = await Promise.all(
    Array.from({ length: 15 }, () =>
      checkAndConsume({ subject, endpoint: 'activate', limit: 10, windowMs: 60_000 }, client)
    )
  );
  assert.equal(results.filter((r) => r.allowed).length, 10);
  await client.rateLimitBucket.deleteMany({ where: { subject } }).catch(() => undefined);
});

// ---- P1-1: duplicate device_id ---------------------------------------------

test('P1-1: same active device_id -> DEVICE_ALREADY_ACTIVE, code not consumed', { skip: SKIP }, async () => {
  const user = await createUser();
  await createDevice(user.id, 'same-d', 'active');
  const c = await createCode(user.id);

  await assert.rejects(
    performActivation({ code: c, deviceId: 'same-d', deviceName: 'x', platform: 'windows', clientVersion: '0.1.0' }, client),
    (err: ActivationError) => err.code === 'DEVICE_ALREADY_ACTIVE'
  );
  // 激活码未被消费。
  const codeRow = await client.activationCode.findFirst({ where: { userId: user.id } });
  assert.equal(codeRow?.consumedAt, null);
  await cleanupUser(user.id);
});

test('P1-1: revoked device can reactivate', { skip: SKIP }, async () => {
  const user = await createUser();
  await createDevice(user.id, 'rv', 'revoked');
  const c = await createCode(user.id);

  const res = await performActivation({ code: c, deviceId: 'rv', deviceName: 'rv2', platform: 'windows', clientVersion: '0.1.0' }, client);
  assert.ok(res.license);
  const dev = await client.deviceActivation.findUnique({ where: { userId_deviceId: { userId: user.id, deviceId: 'rv' } } });
  assert.equal(dev?.status, 'active');
  await cleanupUser(user.id);
});

test('P1-1: revoked device reactivation counts toward the 3-device limit', { skip: SKIP }, async () => {
  const user = await createUser();
  await createDevice(user.id, 'd1', 'active');
  await createDevice(user.id, 'd2', 'active');
  await createDevice(user.id, 'd3', 'active');
  await createDevice(user.id, 'rv', 'revoked'); // 4th device, revoked
  const c = await createCode(user.id);

  // 3 active others -> reactivating the revoked one must hit the limit.
  await assert.rejects(
    performActivation({ code: c, deviceId: 'rv', deviceName: 'rv', platform: 'windows', clientVersion: '0.1.0' }, client),
    (err: ActivationError) => err.code === 'DEVICE_LIMIT_EXCEEDED'
  );
  // code not consumed
  const codeRow = await client.activationCode.findFirst({ where: { userId: user.id } });
  assert.equal(codeRow?.consumedAt, null);
  await cleanupUser(user.id);
});

// ---- P1-3: nickname in transaction result ----------------------------------

test('P1-3: performActivation returns nickname (read inside tx, no post-tx query)', { skip: SKIP }, async () => {
  const user = await createUser();
  const c = await createCode(user.id);
  const res = await performActivation({ code: c, deviceId: 'n1', deviceName: 'n', platform: 'windows', clientVersion: '0.1.0' }, client);
  assert.equal(res.nickname, user.nickname);
  await cleanupUser(user.id);
});

// ---- P2-2: ReleaseManifest deterministic (newest isLatest) -----------------

test('P2-2: multiple isLatest -> newest by publishedAt is selected', { skip: SKIP }, async () => {
  const user = await createUser();
  const c = await createCode(user.id);
  const product = 'memory-node';
  // 两条 isLatest=true；较新的 minVersion 更高。选择最新 → CLIENT_TOO_OLD。
  await client.releaseManifest.create({
    data: { product, version: '0.9.0', platform: 'windows', downloadUrl: 'u', sha256: 'a', minVersion: '0.0.1', isLatest: true, publishedAt: new Date(Date.now() - 2 * 86400_000) },
  });
  await client.releaseManifest.create({
    data: { product, version: '1.0.0', platform: 'windows', downloadUrl: 'u', sha256: 'b', minVersion: '0.5.0', isLatest: true, publishedAt: new Date(Date.now() - 1 * 86400_000) },
  });

  await assert.rejects(
    performActivation({ code: c, deviceId: 'r1', deviceName: 'r', platform: 'windows', clientVersion: '0.1.0' }, client),
    (err: ActivationError) => err.code === 'CLIENT_TOO_OLD'
  );
  await client.releaseManifest.deleteMany({ where: { product } }).catch(() => undefined);
  await cleanupUser(user.id);
});

// ---- P2-3: user-dimension rate limit ---------------------------------------

test('P2-3: user subject rate limit -> 6th call denied (limit 5)', { skip: SKIP }, async () => {
  const subject = `user:${Math.floor(Math.random() * 1e9)}`;
  const results: boolean[] = [];
  for (let i = 0; i < 6; i++) {
    results.push((await checkAndConsume({ subject, endpoint: 'code:user', limit: 5, windowMs: 600_000 }, client)).allowed);
  }
  assert.equal(results.filter(Boolean).length, 5);
  await client.rateLimitBucket.deleteMany({ where: { subject } }).catch(() => undefined);
});

// ---- P1-2: cron cleanup auth + precision -----------------------------------

test('P1-2: cron cleanup — unauthorized -> 401; authorized deletes only expired', { skip: SKIP }, async () => {
  // Dynamic import so the route's lib/db singleton (DATABASE_URL=TEST_DB set in runner env)
  // is used. CRON_SECRET was set in setup.
  const { GET } = await import('../app/api/cron/cleanup-rate-limits/route');

  // seed: 1 expired bucket + 1 fresh bucket; 1 expired-old code + 1 valid code
  const s = Math.random().toString(36).slice(2, 8);
  const now = Date.now();
  await client.rateLimitBucket.create({
    data: { subject: `cron-${s}`, endpoint: 'activate', windowStart: new Date(now - 120_000), count: 1, expiresAt: new Date(now - 60_000), createdAt: new Date(now - 120_000) },
  });
  await client.rateLimitBucket.create({
    data: { subject: `cron-${s}-fresh`, endpoint: 'activate', windowStart: new Date(now), count: 1, expiresAt: new Date(now + 60_000), createdAt: new Date(now) },
  });
  const u = await createUser();
  await client.activationCode.create({
    data: { codeHash: hashActivationCode('OLDCODE1'), userId: u.id, expiresAt: new Date(now - 8 * 86400_000) }, // expired + past retention
  });
  await client.activationCode.create({
    data: { codeHash: hashActivationCode('VALIDCOD'), userId: u.id, expiresAt: new Date(now + 5 * 60_000) }, // still valid
  });

  // 1) unauthorized (no bearer)
  const noAuth = await GET(new Request('http://x/api/cron/cleanup-rate-limits'));
  assert.equal(noAuth.status, 401);

  // 2) authorized
  const ok = await GET(new Request('http://x/api/cron/cleanup-rate-limits', {
    headers: { authorization: 'Bearer test-cron-secret' },
  }));
  assert.equal(ok.status, 200);
  const body = (await ok.json()) as { rate_limit_buckets_deleted: number; activation_codes_deleted: number };
  assert.equal(body.rate_limit_buckets_deleted, 1);
  assert.equal(body.activation_codes_deleted, 1);

  // fresh bucket + valid code remain
  const freshBucket = await client.rateLimitBucket.findFirst({ where: { subject: `cron-${s}-fresh` } });
  assert.ok(freshBucket);
  const validCode = await client.activationCode.findFirst({ where: { codeHash: hashActivationCode('VALIDCOD') } });
  assert.ok(validCode);

  await client.rateLimitBucket.deleteMany({ where: { subject: { startsWith: `cron-${s}` } } }).catch(() => undefined);
  await cleanupUser(u.id);
});

test('teardown: disconnect throwaway DB', { skip: SKIP }, async () => {
  if (client) await client.$disconnect();
});
