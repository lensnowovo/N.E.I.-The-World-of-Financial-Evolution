// Offline tests for client-IP parsing (P1-2) and activation input validation (P2-1).
// Run: npm run test:activation   (node --import tsx --test)
// Pure modules — no database.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getClientIp, isValidIp, MAX_IP_LEN } from '../lib/client-ip';
import { validateActivationInput } from '../lib/activation-input';

function headers(map: Record<string, string>) {
  return {
    get(name: string): string | null {
      for (const k of Object.keys(map)) {
        if (k.toLowerCase() === name.toLowerCase()) return map[k];
      }
      return null;
    },
  };
}

// ---------------------------------------------------------------------------
// isValidIp / getClientIp
// ---------------------------------------------------------------------------

test('isValidIp accepts IPv4 and IPv6, rejects junk', () => {
  assert.equal(isValidIp('1.2.3.4'), true);
  assert.equal(isValidIp('::1'), true);
  assert.equal(isValidIp('2001:db8::1'), true);
  assert.equal(isValidIp('not-an-ip'), false);
  assert.equal(isValidIp('1.2.3.4:5678'), false); // port rejected
  assert.equal(isValidIp(''), false);
  assert.equal(isValidIp(null), false);
});

test('getClientIp prefers x-real-ip', () => {
  const ip = getClientIp(
    headers({ 'x-real-ip': '203.0.113.7', 'x-forwarded-for': '198.51.100.2' })
  );
  assert.equal(ip, '203.0.113.7');
});

test('getClientIp falls back to the leftmost x-forwarded-for value', () => {
  const ip = getClientIp(
    headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' })
  );
  assert.equal(ip, '203.0.113.7');
});

test('getClientIp never skips an invalid leftmost XFF value', () => {
  // Do not let an attacker choose a later value by placing junk first.
  const ip = getClientIp(
    headers({ 'x-forwarded-for': 'spoofed, 203.0.113.9' })
  );
  assert.equal(ip, 'unknown');
});

test('getClientIp falls through to x-vercel-forwarded-for when XFF leftmost is invalid', () => {
  const ip = getClientIp(
    headers({
      'x-forwarded-for': 'spoofed, 203.0.113.9',
      'x-vercel-forwarded-for': '198.51.100.8, 10.0.0.1',
    })
  );
  assert.equal(ip, '198.51.100.8');
});

test('getClientIp returns unknown when all headers invalid', () => {
  assert.equal(getClientIp(headers({ 'x-real-ip': 'not-an-ip' })), 'unknown');
  assert.equal(getClientIp(headers({ 'x-forwarded-for': 'junk, also-junk' })), 'unknown');
  assert.equal(getClientIp(headers({})), 'unknown');
});

test('getClientIp rejects super-long header values', () => {
  const long = 'a'.repeat(MAX_IP_LEN + 10);
  assert.equal(getClientIp(headers({ 'x-real-ip': long })), 'unknown');
});

test('getClientIp rejects IPv4 with port in x-real-ip', () => {
  assert.equal(getClientIp(headers({ 'x-real-ip': '1.2.3.4:5678' })), 'unknown');
});

// ---------------------------------------------------------------------------
// validateActivationInput
// ---------------------------------------------------------------------------

const OK = {
  code: 'A1B2C3D4',
  device_id: '550e8400-e29b-41d4-a716-446655440000',
  device_name: '我的笔记本',
  platform: 'windows',
  client_version: '0.1.0',
};

test('validateActivationInput accepts a valid body', () => {
  const r = validateActivationInput(OK);
  assert.ok(r);
  assert.equal(r?.deviceName, '我的笔记本');
});

test('device_name: trims, 1-80 chars', () => {
  assert.ok(validateActivationInput({ ...OK, device_name: '   ab   ' }));
  assert.equal(validateActivationInput({ ...OK, device_name: '   ' }), null); // empty after trim
  assert.equal(
    validateActivationInput({ ...OK, device_name: 'x'.repeat(81) }),
    null
  );
  assert.ok(validateActivationInput({ ...OK, device_name: 'x'.repeat(80) }));
});

test('device_name: rejects control characters', () => {
  assert.equal(validateActivationInput({ ...OK, device_name: 'a\x00b' }), null);
  assert.equal(validateActivationInput({ ...OK, device_name: 'a\x1Fb' }), null);
  assert.equal(validateActivationInput({ ...OK, device_name: 'a\x7Fb' }), null);
  assert.equal(validateActivationInput({ ...OK, device_name: 'a\nb' }), null); // newline is control
});

test('code: length cap then format', () => {
  assert.equal(validateActivationInput({ ...OK, code: 'A'.repeat(17) }), null);
  assert.equal(validateActivationInput({ ...OK, code: 'A1B2C3D' }), null); // too short
  assert.equal(validateActivationInput({ ...OK, code: 'I1B2C3D4' }), null); // I excluded
});

test('client_version: length cap + semver', () => {
  assert.equal(
    validateActivationInput({ ...OK, client_version: '0'.repeat(33) }),
    null
  );
  assert.equal(validateActivationInput({ ...OK, client_version: '0.1' }), null);
  assert.equal(validateActivationInput({ ...OK, client_version: 'v0.1.0' }), null);
});

test('device_id: uuid required', () => {
  assert.equal(validateActivationInput({ ...OK, device_id: 'not-a-uuid' }), null);
  assert.equal(
    validateActivationInput({ ...OK, device_id: 'x'.repeat(65) }),
    null
  );
});

test('platform: only windows|macos', () => {
  assert.equal(validateActivationInput({ ...OK, platform: 'linux' }), null);
});

test('missing/wrong-type fields rejected', () => {
  assert.equal(validateActivationInput({}), null);
  assert.equal(validateActivationInput({ ...OK, code: 123 }), null);
});
