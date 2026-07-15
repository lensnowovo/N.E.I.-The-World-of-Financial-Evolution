// Integration tests for the activation transaction concurrency guarantees.
// Run (needs a throwaway DB): npm run test:activation:integration
//   TEST_DATABASE_URL=<throwaway postgres> node --import tsx --test scripts/check-activation-concurrency.test.ts
//
// Gated on TEST_DATABASE_URL: when unset (e.g. CI without a DB) every test is
// skipped, so this file is safe to keep in the default test run. Run locally
// against a disposable Postgres only — NEVER against production.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

import { generateActivationCode, hashActivationCode } from '../lib/activation-code';
import {
  ActivationError,
  performActivation,
} from '../lib/activation';
import { checkAndConsume } from '../lib/rate-limit';

const TEST_DB = process.env.TEST_DATABASE_URL;
const SKIP = !TEST_DB;

// License signing needs a key; use the published non-production test vector.
const TEST_PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIJjku/Q96QGT2fmm9Uqf5QDqXHV/tSzZjBP60OKSCDsV
-----END PRIVATE KEY-----`;

let client: PrismaClient;

test('setup: connect throwaway DB', { skip: SKIP }, async () => {
  process.env.MEMORY_LICENSE_PRIVATE_KEY = TEST_PRIVATE_KEY_PEM;
  client = new PrismaClient({ datasources: { db: { url: TEST_DB } } });
  await client.$connect();
});

interface Seed {
  userId: number;
  codes: string[]; // plaintext codes
}

async function seedUser(
  opts: { activeDevices: number; codes: number; plan?: string; expiresAt?: Date | null }
): Promise<Seed> {
  const suffix = Math.random().toString(36).slice(2, 10);
  const user = await client.user.create({
    data: {
      email: `act-${suffix}@test.local`,
      nickname: `act-${suffix}`,
      role: 'VC',
    },
  });
  await client.entitlement.create({
    data: {
      userId: user.id,
      plan: opts.plan ?? 'memory-node-pro',
      status: 'active',
      expiresAt: opts.expiresAt === undefined ? null : opts.expiresAt,
    },
  });
  for (let i = 0; i < opts.activeDevices; i++) {
    await client.deviceActivation.create({
      data: {
        userId: user.id,
        deviceId: `seed-${suffix}-${i}`,
        deviceName: `seed-${i}`,
        platform: 'windows',
        clientVersion: '0.1.0',
        status: 'active',
      },
    });
  }
  const codes: string[] = [];
  for (let i = 0; i < opts.codes; i++) {
    const c = generateActivationCode();
    await client.activationCode.create({
      data: {
        codeHash: hashActivationCode(c),
        userId: user.id,
        expiresAt: new Date(Date.now() + 5 * 60_000),
      },
    });
    codes.push(c);
  }
  return { userId: user.id, codes };
}

async function cleanupUser(userId: number, ip: string) {
  await client.user.delete({ where: { id: userId } }).catch(() => undefined);
  await client.rateLimitBucket.deleteMany({ where: { ip } }).catch(() => undefined);
}

function did(_didSeed: string, suffix: string, n: number) {
  return `${suffix}-dev${n}`;
}

// ---------------------------------------------------------------------------
// Device-limit concurrency (B1): two different codes for the same user with 2
// pre-existing active devices -> exactly one succeeds, the other is blocked.
// ---------------------------------------------------------------------------

test('device limit: two concurrent activations -> exactly one succeeds (B1)', { skip: SKIP }, async () => {
  const ip = `b1-${Math.random().toString(36).slice(2, 8)}`;
  const seed = await seedUser({ activeDevices: 2, codes: 2 });
  const suffix = String(seed.userId);

  const results = await Promise.allSettled([
    performActivation(
      { code: seed.codes[0], deviceId: did('', suffix, 3), deviceName: 'd3', platform: 'windows', clientVersion: '0.1.0' },
      client
    ),
    performActivation(
      { code: seed.codes[1], deviceId: did('', suffix, 4), deviceName: 'd4', platform: 'windows', clientVersion: '0.1.0' },
      client
    ),
  ]);

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
  assert.equal(fulfilled.length, 1, `expected exactly 1 success, got ${fulfilled.length}`);
  assert.equal(rejected.length, 1, `expected exactly 1 rejection, got ${rejected.length}`);
  const err = rejected[0].reason;
  assert.ok(err instanceof ActivationError, 'rejected for wrong reason type');
  assert.equal(err.code, 'DEVICE_LIMIT_EXCEEDED');

  const active = await client.deviceActivation.count({
    where: { userId: seed.userId, status: 'active' },
  });
  assert.equal(active, 3, 'should cap at 3 active devices');

  await cleanupUser(seed.userId, ip);
});

// ---------------------------------------------------------------------------
// Same-code concurrency (B7): same activation code, two devices -> one succeeds,
// the other gets CODE_CONSUMED; consumedAt written exactly once.
// ---------------------------------------------------------------------------

test('same-code: concurrent consume -> 1 success + 1 CODE_CONSUMED (B7)', { skip: SKIP }, async () => {
  const ip = `b7-${Math.random().toString(36).slice(2, 8)}`;
  const seed = await seedUser({ activeDevices: 0, codes: 1 });
  const suffix = String(seed.userId);

  const results = await Promise.allSettled([
    performActivation(
      { code: seed.codes[0], deviceId: did('', suffix, 1), deviceName: 'a', platform: 'windows', clientVersion: '0.1.0' },
      client
    ),
    performActivation(
      { code: seed.codes[0], deviceId: did('', suffix, 2), deviceName: 'b', platform: 'windows', clientVersion: '0.1.0' },
      client
    ),
  ]);

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
  assert.equal(fulfilled.length, 1, `expected 1 success, got ${fulfilled.length}`);
  assert.equal(rejected.length, 1, `expected 1 rejection, got ${rejected.length}`);
  const err = rejected[0].reason;
  assert.ok(err instanceof ActivationError);
  assert.equal(err.code, 'CODE_CONSUMED');

  const active = await client.deviceActivation.count({
    where: { userId: seed.userId, status: 'active' },
  });
  assert.equal(active, 1, 'only one device should have activated');

  // The code row is consumed exactly once (consumedAt set, single deviceId).
  const rows = await client.activationCode.findMany({ where: { userId: seed.userId } });
  assert.equal(rows.length, 1);
  assert.ok(rows[0].consumedAt !== null, 'consumedAt must be set');
  assert.ok(rows[0].deviceId !== null);

  await cleanupUser(seed.userId, ip);
});

// ---------------------------------------------------------------------------
// Rate-limit atomicity (B2): 15 concurrent checkAndConsume with limit 10 ->
// exactly 10 allowed.
// ---------------------------------------------------------------------------

test('rate-limit: 15 concurrent -> exactly 10 allowed (B2)', { skip: SKIP }, async () => {
  const ip = `b2-${Math.random().toString(36).slice(2, 8)}`;
  const results = await Promise.all(
    Array.from({ length: 15 }, () =>
      checkAndConsume({ ip, endpoint: 'activate', limit: 10, windowMs: 60_000 }, client)
    )
  );
  const allowed = results.filter((r) => r.allowed).length;
  assert.equal(allowed, 10, `expected exactly 10 allowed, got ${allowed}`);
  await client.rateLimitBucket.deleteMany({ where: { ip } }).catch(() => undefined);
});

test('teardown: disconnect throwaway DB', { skip: SKIP }, async () => {
  if (client) await client.$disconnect();
});
