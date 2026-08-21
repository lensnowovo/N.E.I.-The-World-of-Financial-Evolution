import assert from 'node:assert/strict';
import test from 'node:test';
import { activationDeepLink, activationErrorMessage } from '../app/memory/setup/ActivationCodePanel';
import { parseMemoryWindowsRelease } from '../lib/memory-windows-release';

test('activation setup maps stable server errors without leaking details', () => {
  assert.equal(
    activationErrorMessage('NO_ENTITLEMENT'),
    '当前账号还没有 Memory Node 内测资格。',
  );
  assert.equal(
    activationErrorMessage('RATE_LIMITED', 42),
    '生成次数过多，请稍后再试。 42 秒后可以重试。',
  );
  assert.equal(
    activationErrorMessage('UNEXPECTED_INTERNAL_DETAIL'),
    '暂时无法生成激活码，请稍后再试。',
  );
});

test('activation setup emits only the registered Memory Node deep-link contract', () => {
  assert.equal(
    activationDeepLink('ABCD1234', '550e8400-e29b-41d4-a716-446655440000'),
    'nei-memory-node://activate?code=ABCD1234&state=550e8400-e29b-41d4-a716-446655440000',
  );
  assert.throws(() => activationDeepLink('ABCDI234', '550e8400-e29b-41d4-a716-446655440000'));
  assert.throws(() => activationDeepLink('ABCD1234', 'not-a-state'));
});

const validWindowsRelease = {
  NEXT_PUBLIC_MEMORY_NODE_WINDOWS_SIGNED: 'true',
  NEXT_PUBLIC_MEMORY_NODE_WINDOWS_VERSION: '0.1.3',
  NEXT_PUBLIC_MEMORY_NODE_WINDOWS_SHA256:
    'f49f675467026b39c6fa03beb8eac7ce92c8dacfb4c5e5d4a652af516a0c3f60',
  NEXT_PUBLIC_MEMORY_NODE_WINDOWS_DOWNLOAD_URL:
    'https://github.com/lensnowovo/nei-memory-node/releases/download/v0.1.3/N.E.I.%20Memory%20Node_0.1.3_x64-setup.exe',
};

test('Memory Node download opens only for a coherent signed GitHub release', () => {
  assert.deepEqual(parseMemoryWindowsRelease(validWindowsRelease), {
    downloadUrl:
      'https://github.com/lensnowovo/nei-memory-node/releases/download/v0.1.3/N.E.I.%20Memory%20Node_0.1.3_x64-setup.exe',
    version: '0.1.3',
    sha256: 'F49F675467026B39C6FA03BEB8EAC7CE92C8DACFB4C5E5D4A652AF516A0C3F60',
  });
});

test('Memory Node download fails closed for incomplete or inconsistent metadata', () => {
  assert.equal(
    parseMemoryWindowsRelease({ ...validWindowsRelease, NEXT_PUBLIC_MEMORY_NODE_WINDOWS_SIGNED: 'false' }),
    null,
  );
  assert.equal(
    parseMemoryWindowsRelease({ ...validWindowsRelease, NEXT_PUBLIC_MEMORY_NODE_WINDOWS_SHA256: 'not-a-sha' }),
    null,
  );
  assert.equal(
    parseMemoryWindowsRelease({
      ...validWindowsRelease,
      NEXT_PUBLIC_MEMORY_NODE_WINDOWS_DOWNLOAD_URL:
        'http://github.com/lensnowovo/nei-memory-node/releases/download/v0.1.3/setup.exe',
    }),
    null,
  );
  assert.equal(
    parseMemoryWindowsRelease({
      ...validWindowsRelease,
      NEXT_PUBLIC_MEMORY_NODE_WINDOWS_DOWNLOAD_URL:
        'https://github.com/another/repository/releases/download/v0.1.3/setup.exe',
    }),
    null,
  );
  assert.equal(
    parseMemoryWindowsRelease({
      ...validWindowsRelease,
      NEXT_PUBLIC_MEMORY_NODE_WINDOWS_DOWNLOAD_URL:
        'https://github.com/lensnowovo/nei-memory-node/releases/download/v0.1.2/setup.exe',
    }),
    null,
  );
  assert.equal(
    parseMemoryWindowsRelease({
      ...validWindowsRelease,
      NEXT_PUBLIC_MEMORY_NODE_WINDOWS_DOWNLOAD_URL:
        'https://github.com/lensnowovo/nei-memory-node/releases/download/v0.1.3/setup.exe?redirect=1',
    }),
    null,
  );
});
