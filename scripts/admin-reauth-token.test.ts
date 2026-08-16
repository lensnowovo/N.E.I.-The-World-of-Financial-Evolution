import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  ADMIN_REAUTH_MAX_AGE_SECONDS,
  issueAdminReauthToken,
  verifyAdminReauthToken,
} from '../lib/admin-reauth-token';

test('admin reauth token is valid for the expected admin during the 15 minute window', () => {
  const now = Date.UTC(2026, 7, 16, 5, 0, 0);
  const token = issueAdminReauthToken(7, now);
  const result = verifyAdminReauthToken(token, 7, now + 60_000);
  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.expiresAt, now + ADMIN_REAUTH_MAX_AGE_SECONDS * 1000);
  }
});

test('admin reauth token is bound to the current user', () => {
  const token = issueAdminReauthToken(7, 1000);
  assert.deepEqual(verifyAdminReauthToken(token, 8, 2000), { valid: false });
});

test('admin reauth token expires after 15 minutes', () => {
  const now = 1000;
  const token = issueAdminReauthToken(7, now);
  assert.deepEqual(
    verifyAdminReauthToken(token, 7, now + ADMIN_REAUTH_MAX_AGE_SECONDS * 1000),
    { valid: false },
  );
});

test('admin reauth token rejects signature and payload tampering', () => {
  const token = issueAdminReauthToken(7, 1000);
  const [payload, signature] = token.split('.');
  assert.deepEqual(verifyAdminReauthToken(`${payload}x.${signature}`, 7, 2000), { valid: false });
  assert.deepEqual(verifyAdminReauthToken(`${payload}.${signature}x`, 7, 2000), { valid: false });
});

test('all high-risk admin mutation routes require recent authentication', async () => {
  const routes = [
    'app/api/admin/posts/[id]/feature/route.ts',
    'app/api/admin/posts/[id]/review/route.ts',
    'app/api/admin/posts/featured-order/route.ts',
    'app/api/admin/reports/[id]/route.ts',
    'app/api/admin/memory-entitlements/route.ts',
  ];
  for (const route of routes) {
    const source = await readFile(route, 'utf8');
    assert.match(source, /requireRecentAdmin\(\)/, route);
    assert.doesNotMatch(source, /const guard = await requireAdmin\(\)/, route);
  }
});

test('admin override edits and deletes require recent authentication', async () => {
  const source = await readFile('app/api/posts/[id]/route.ts', 'utf8');
  assert.equal((source.match(/requireRecentAdmin\(\)/g) || []).length, 2);
  assert.match(source, /user\.isAdmin && user\.id !== post\.userId/);
});

test('database health check is protected by a non-public bearer token', async () => {
  const route = await readFile('app/api/health/route.ts', 'utf8');
  const workflow = await readFile('.github/workflows/uptime.yml', 'utf8');
  assert.match(route, /process\.env\.HEALTHCHECK_TOKEN/);
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /status: 404/);
  assert.match(workflow, /secrets\.HEALTHCHECK_TOKEN/);
  assert.match(workflow, /Authorization: Bearer \$HEALTHCHECK_TOKEN/);
});
