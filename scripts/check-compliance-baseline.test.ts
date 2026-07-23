import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { serializeJsonLd } from '../lib/json-ld';
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
  isCurrentRegistrationConsent,
} from '../lib/legal';
import { PUBLIC_SOCIAL_INTERACTIONS_ENABLED } from '../lib/community-features';

test('JSON-LD serialization cannot close the script element', () => {
  const output = serializeJsonLd({ title: '</script><script>alert(1)</script>' });
  assert.equal(output.includes('</script>'), false);
  assert.match(output, /\\u003c\/script>/);
});

test('registration consent must be explicit and version matched', () => {
  assert.equal(
    isCurrentRegistrationConsent({
      termsAccepted: true,
      privacyAccepted: true,
      adultConfirmed: true,
      crossBorderAccepted: true,
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
    }),
    true,
  );
  assert.equal(
    isCurrentRegistrationConsent({
      termsAccepted: true,
      privacyAccepted: true,
      adultConfirmed: true,
      crossBorderAccepted: true,
      termsVersion: 'stale',
      privacyVersion: PRIVACY_VERSION,
    }),
    false,
  );
});

test('apply_skill accepts only a Skill id and keeps project context local', async () => {
  const source = await readFile(new URL('../app/api/mcp/route.ts', import.meta.url), 'utf8');
  const start = source.indexOf("'apply_skill'");
  const end = source.indexOf("'favorite_skill'", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const block = source.slice(start, end);
  assert.equal(block.includes('context:'), false);
  assert.equal(block.includes('args.context'), false);
  assert.match(block, /filled locally|Fill them only inside your trusted Agent client/);
});

test('public social interactions are disabled while historical data is preserved', async () => {
  assert.equal(PUBLIC_SOCIAL_INTERACTIONS_ENABLED, false);
  const postPage = await readFile(new URL('../app/posts/[id]/page.tsx', import.meta.url), 'utf8');
  assert.equal(postPage.includes('<CommentSection'), false);
  const likeRoute = await readFile(new URL('../app/api/comments/[id]/like/route.ts', import.meta.url), 'utf8');
  const followRoute = await readFile(new URL('../app/api/users/[id]/follow/route.ts', import.meta.url), 'utf8');
  assert.match(likeRoute, /status: 410/);
  assert.match(followRoute, /status: 410/);
});

test('one-time secrets are explicitly non-cacheable', async () => {
  const headers = await readFile(new URL('../lib/http-security.ts', import.meta.url), 'utf8');
  assert.match(headers, /no-store, private/);
  for (const route of [
    '../app/api/users/me/mcp-tokens/route.ts',
    '../app/api/activation/code/route.ts',
    '../app/api/activation/activate/route.ts',
  ]) {
    assert.match(await readFile(new URL(route, import.meta.url), 'utf8'), /SECRET_RESPONSE_HEADERS/);
  }
});
