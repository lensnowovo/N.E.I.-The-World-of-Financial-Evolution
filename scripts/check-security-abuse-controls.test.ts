import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  activityActorSubject,
  activityPathFingerprint,
  MAX_ACTIVITY_BODY_BYTES,
  normalizeActivityPath,
  postIdFromActivityPath,
} from '../lib/activity-ingest';
import { hashedRateLimitSubject } from '../lib/rate-limit-subject';

const root = resolve(import.meta.dirname, '..');
const source = (path: string) => readFileSync(resolve(root, path), 'utf8');

test('activity input normalization is bounded and post paths are parsed strictly', () => {
  assert.equal(MAX_ACTIVITY_BODY_BYTES, 4096);
  assert.equal(normalizeActivityPath('https://evil.example/posts/1'), '/');
  assert.equal(normalizeActivityPath(`/${'a'.repeat(200)}`).length, 120);
  assert.equal(normalizeActivityPath('/posts/61?token=secret#section'), '/posts/61');
  assert.equal(postIdFromActivityPath('/posts/61?from=home'), 61);
  assert.equal(postIdFromActivityPath('/posts/0'), null);
  assert.equal(postIdFromActivityPath('/api/posts/61'), null);
  assert.equal(postIdFromActivityPath('/posts/61evil'), null);
});

test('activity actor identity prefers authenticated user and path bucket labels are opaque', () => {
  assert.equal(activityActorSubject(7, 'anon_x', '203.0.113.4'), 'user:7');
  assert.equal(activityActorSubject(null, 'anon_x', '203.0.113.4'), 'anonymous:anon_x');
  assert.equal(activityActorSubject(null, null, '203.0.113.4'), 'ip:203.0.113.4');
  assert.match(activityPathFingerprint('/posts/61?secret=value'), /^[a-f0-9]{16}$/);
  assert.doesNotMatch(activityPathFingerprint('/posts/61?secret=value'), /secret|posts/);
});

test('account rate-limit subjects never retain the original email', () => {
  const subject = hashedRateLimitSubject('email', 'person@example.com');
  assert.match(subject, /^email:[a-f0-9]{64}$/);
  assert.doesNotMatch(subject, /person|example\.com|@/);
});

test('login and password reset use persistent cross-instance limits', () => {
  const login = source('app/api/auth/login/route.ts');
  const reset = source('app/api/auth/reset-password/route.ts');
  for (const route of [login, reset]) {
    assert.match(route, /checkAndConsume/);
    assert.doesNotMatch(route, /checkRateLimit/);
  }
  assert.match(login, /auth:login:account-failure/);
  assert.match(login, /auth:login:ip-failure/);
  assert.match(login, /hashedRateLimitSubject/);
  assert.match(reset, /auth:reset-password:account/);
  assert.match(reset, /hashedRateLimitSubject/);
  assert.match(reset, /verificationCode\.updateMany/);
});

test('activity ingestion has body limits, fast rejection, persistent budgets and deduplication', () => {
  const activity = source('app/api/activity/route.ts');
  assert.match(activity, /MAX_ACTIVITY_BODY_BYTES/);
  assert.match(activity, /checkRateLimit/);
  assert.match(activity, /checkAndConsume/);
  assert.match(activity, /activity:page-view:ip/);
  assert.match(activity, /activity:page-view:actor/);
  assert.match(activity, /deduplicated: true/);
  assert.match(activity, /postIdFromActivityPath/);
  assert.ok(
    activity.indexOf("endpoint: 'activity:page-view:ip'") <
      activity.indexOf("endpoint: 'activity:page-view:actor'"),
    'IP quota must be checked before an attacker-controlled anonymous actor creates a bucket',
  );
  assert.doesNotMatch(activity, /Promise\.all\(\[\s*checkAndConsume/);
});

test('all public Skill detail reads are free of direct analytics writes', () => {
  const detailApi = source('app/api/posts/[id]/route.ts');
  const detailPage = source('app/posts/[id]/page.tsx');
  const publicApi = source('app/api/v1/skills/[id]/route.ts');
  for (const file of [detailApi, detailPage, publicApi]) {
    assert.doesNotMatch(file, /viewCount:\s*\{\s*increment:\s*1/);
    assert.doesNotMatch(file, /trackActivity\s*\(/);
  }
});
