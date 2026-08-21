import assert from 'node:assert/strict';
import test from 'node:test';
import { activationDeepLink, activationErrorMessage } from '../app/memory/setup/ActivationCodePanel';

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
