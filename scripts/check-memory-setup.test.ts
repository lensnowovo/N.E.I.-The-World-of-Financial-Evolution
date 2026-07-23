import assert from 'node:assert/strict';
import test from 'node:test';
import { activationErrorMessage } from '../app/memory/setup/ActivationCodePanel';

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
