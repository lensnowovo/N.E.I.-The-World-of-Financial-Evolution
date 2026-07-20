// Offline tests for the activation license + code modules (no database).
// Run: npm run test:activation
//   (node --import tsx --test scripts/check-activation-license.test.ts)
//
// Covers: activation-code format/hash, unified expiry (exp/ga) semantics, and the
// fixed Ed25519 cross-language interop vector (contract §18.3) — Node sign/verify,
// tamper / wrong-key / bad-length rejection.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  type KeyObject,
} from 'node:crypto';

import {
  generateActivationCode,
  hashActivationCode,
  isValidCodeFormat,
} from '../lib/activation-code';
import {
  computeExpiry,
  issueLicense,
  verifyLicense,
} from '../lib/activation-license';
import { computeRateWindow, retryAfterSeconds } from '../lib/rate-window';

// ---------------------------------------------------------------------------
// activation-code
// ---------------------------------------------------------------------------

test('generateActivationCode produces 8-char Crockford Base32', () => {
  for (let i = 0; i < 200; i++) {
    const c = generateActivationCode();
    assert.equal(c.length, 8, `bad length: ${c}`);
    assert.ok(isValidCodeFormat(c), `invalid format: ${c}`);
    // Crockford excludes I/L/O/U (case-insensitive).
    assert.ok(!/[ILOUilou]/.test(c), `excluded char present: ${c}`);
  }
});

test('hashActivationCode is case-insensitive', () => {
  assert.equal(hashActivationCode('A1B2C3D4'), hashActivationCode('a1b2c3d4'));
  assert.equal(hashActivationCode('A1B2C3D4').length, 64); // sha-256 hex
});

test('isValidCodeFormat rejects wrong length / non-Crockford', () => {
  assert.ok(isValidCodeFormat('A1B2C3D4'));
  assert.ok(isValidCodeFormat('a1b2c3d4')); // case-insensitive
  assert.ok(!isValidCodeFormat('A1B2C3D')); // too short
  assert.ok(!isValidCodeFormat('A1B2C3D4E5')); // too long
  assert.ok(!isValidCodeFormat('I1B2C3D4')); // I excluded
  assert.ok(!isValidCodeFormat('O1B2C3D4')); // O excluded
});

// ---------------------------------------------------------------------------
// computeExpiry — unified exp/ga semantics (contract §6)
// ---------------------------------------------------------------------------

test('computeExpiry: ee=0 -> exp=iat+30d, ga=true', () => {
  const iat = 1_000_000;
  const { exp, ee, ga } = computeExpiry(iat, null);
  assert.equal(ee, 0);
  assert.equal(exp, iat + 30 * 86400);
  assert.equal(ga, true);
});

test('computeExpiry: ee shorter than 30d -> exp truncated, ga=false', () => {
  const iat = 1_000_000;
  const eeDate = new Date((iat + 20 * 86400) * 1000);
  const { exp, ee, ga } = computeExpiry(iat, eeDate);
  assert.equal(ee, iat + 20 * 86400);
  assert.equal(exp, ee); // truncated to entitlement expiry
  assert.equal(ga, false); // entitlement does not outlive natural window -> no grace
});

test('computeExpiry: ee longer than 30d -> exp=iat+30d, ga=true', () => {
  const iat = 1_000_000;
  const eeDate = new Date((iat + 60 * 86400) * 1000);
  const { exp, ee, ga } = computeExpiry(iat, eeDate);
  assert.equal(ee, iat + 60 * 86400);
  assert.equal(exp, iat + 30 * 86400);
  assert.equal(ga, true);
});

// ---------------------------------------------------------------------------
// Fixed Ed25519 interop vector (contract §18.3) — TEST ONLY, never production.
// ---------------------------------------------------------------------------

// This key is the published, non-production test vector already present in the
// merged contract (docs/contracts/memory-node-web-integration.md §18.3). It is
// NOT the production MEMORY_LICENSE_PRIVATE_KEY and must never be used in prod.
const TEST_PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIJjku/Q96QGT2fmm9Uqf5QDqXHV/tSzZjBP60OKSCDsV
-----END PRIVATE KEY-----`;

const TEST_KID = 'key-test-vector';
const TEST_PAYLOAD_JSON =
  '{"v":2,"kid":"key-test-vector","uid":42,"did":"550e8400-e29b-41d4-a716-446655440000","ent":"memory-node-pro","ee":0,"iat":1720800000,"exp":1723392000,"ga":true,"vmin":"0.1.0"}';
const TEST_PAYLOAD_B64 =
  'eyJ2IjoyLCJraWQiOiJrZXktdGVzdC12ZWN0b3IiLCJ1aWQiOjQyLCJkaWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbnQiOiJtZW1vcnktbm9kZS1wcm8iLCJlZSI6MCwiaWF0IjoxNzIwODAwMDAwLCJleHAiOjE3MjMzOTIwMDAsImdhIjp0cnVlLCJ2bWluIjoiMC4xLjAifQ';
const TEST_SIG_B64 =
  'D2t_qcgTdHFETLKDQ3XShhuyMD7HCyjtAH5w_tsxgs41VXH3IGJOon4RXFNoq8c-7JMB4OTYSzS2FyzjbsvEBQ';

function testPrivateKey(): KeyObject {
  return createPrivateKey({ key: Buffer.from(TEST_PRIVATE_KEY_PEM, 'utf8'), format: 'pem' });
}
function testPublicKey(): KeyObject {
  return createPublicKey(testPrivateKey());
}

test('payload base64url matches payload JSON', () => {
  assert.equal(Buffer.from(TEST_PAYLOAD_JSON, 'utf8').toString('base64url'), TEST_PAYLOAD_B64);
});

test('assertion #1: Node crypto.sign reproduces the published signature', () => {
  const sig = sign(null, Buffer.from(TEST_PAYLOAD_JSON, 'utf8'), testPrivateKey());
  assert.equal(sig.toString('base64url'), TEST_SIG_B64);
});

test('assertion #2: verifyLicense accepts the fixed vector and returns matching payload', () => {
  const license = `${TEST_PAYLOAD_B64}.${TEST_SIG_B64}`;
  const res = verifyLicense(license, (kid) =>
    kid === TEST_KID ? testPublicKey() : undefined
  );
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.payload.uid, 42);
    assert.equal(res.payload.ee, 0);
    assert.equal(res.payload.exp, 1_723_392_000);
    assert.equal(res.payload.ga, true);
  }
});

test('assertion #3: flipping a payload byte -> INVALID_SIGNATURE', () => {
  // Flip last char of the payload base64url so it decodes to a different last byte.
  const tamperedB64 = TEST_PAYLOAD_B64.slice(0, -1) + 'A';
  const res = verifyLicense(`${tamperedB64}.${TEST_SIG_B64}`, (kid) =>
    kid === TEST_KID ? testPublicKey() : undefined
  );
  // Either the JSON is unparseable (MALFORMED) or signature fails (INVALID_SIGNATURE);
  // both are acceptable rejections. Must NOT be ok.
  assert.equal(res.ok, false);
});

test('assertion #4: wrong public key -> INVALID_SIGNATURE', () => {
  const other = generateKeyPairSync('ed25519');
  const res = verifyLicense(`${TEST_PAYLOAD_B64}.${TEST_SIG_B64}`, () => other.publicKey);
  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.reason, 'INVALID_SIGNATURE');
});

test('assertion #5: signature length != 64 -> BAD_SIG_LEN', () => {
  // 10-byte signature base64url
  const shortSig = Buffer.alloc(10, 0x41).toString('base64url');
  const res = verifyLicense(`${TEST_PAYLOAD_B64}.${shortSig}`, (kid) =>
    kid === TEST_KID ? testPublicKey() : undefined
  );
  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.reason, 'BAD_SIG_LEN');
});

test('issueLicense with the test key reproduces the fixed vector license', () => {
  const { license } = issueLicense(
    {
      uid: 42,
      did: '550e8400-e29b-41d4-a716-446655440000',
      ent: 'memory-node-pro',
      entitlementExpiresAt: null,
      vmin: '0.1.0',
    },
    {
      privateKey: testPrivateKey(),
      kid: TEST_KID,
      now: new Date(1_720_800_000 * 1000),
    }
  );
  assert.equal(license, `${TEST_PAYLOAD_B64}.${TEST_SIG_B64}`);
});

// ---------------------------------------------------------------------------
// rate-window math
// ---------------------------------------------------------------------------

test('computeRateWindow aligns to window boundary and separates bucketEnd/expiresAt', () => {
  // now = 12:00:30.500 -> 60s window aligned to 12:00:00
  const now = new Date('2026-01-01T12:00:30.500Z').getTime();
  const w = computeRateWindow(now, 60_000);
  assert.equal(w.windowStart.getTime(), new Date('2026-01-01T12:00:00.000Z').getTime());
  assert.equal(w.bucketEnd.getTime(), new Date('2026-01-01T12:01:00.000Z').getTime());
  // expiresAt = bucketEnd + 60s cleanup buffer (NOT used for retryAfter)
  assert.equal(w.expiresAt.getTime(), new Date('2026-01-01T12:02:00.000Z').getTime());
});

test('retryAfterSeconds uses bucketEnd, excludes the 60s cleanup buffer', () => {
  const bucketEnd = new Date('2026-01-01T12:01:00.000Z').getTime();
  const now = new Date('2026-01-01T12:00:30.000Z').getTime(); // 30s into a 60s window
  assert.equal(retryAfterSeconds(bucketEnd, now), 30); // not 90
});
