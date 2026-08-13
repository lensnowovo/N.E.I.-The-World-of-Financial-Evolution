import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MEMORY_TRIAL_DEFAULT_DAYS,
  parseMemoryTrialGrant,
} from '../lib/memory-entitlement';

test('trial grant normalizes an existing account email and defaults to 90 days', () => {
  assert.deepEqual(parseMemoryTrialGrant({ email: ' Lensnowovo@Outlook.com ' }), {
    email: 'lensnowovo@outlook.com',
    days: MEMORY_TRIAL_DEFAULT_DAYS,
  });
});

test('trial grant accepts bounded integer durations', () => {
  assert.deepEqual(parseMemoryTrialGrant({ email: 'user@example.com', days: 1 }), {
    email: 'user@example.com',
    days: 1,
  });
  assert.deepEqual(parseMemoryTrialGrant({ email: 'user@example.com', days: 365 }), {
    email: 'user@example.com',
    days: 365,
  });
});

test('trial grant rejects malformed requests and unsafe durations', () => {
  for (const value of [
    null,
    [],
    {},
    { email: 'invalid' },
    { email: 'user@example.com', days: 0 },
    { email: 'user@example.com', days: 366 },
    { email: 'user@example.com', days: 30.5 },
    { email: 'user@example.com', days: '90' },
  ]) {
    assert.equal(parseMemoryTrialGrant(value), null);
  }
});

test('admin entitlement route is guarded and does not create users', async () => {
  const source = await import('node:fs/promises').then((fs) =>
    fs.readFile(new URL('../app/api/admin/memory-entitlements/route.ts', import.meta.url), 'utf8'),
  );
  assert.match(source, /await requireAdmin\(\)/);
  assert.doesNotMatch(source, /prisma\.user\.(create|upsert)\(/);
  assert.match(source, /prisma\.entitlement\.upsert\(/);
  assert.match(source, /ENTITLEMENT_MANAGED/);
});
