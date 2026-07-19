import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const schema = readFileSync(join(root, 'prisma', 'schema.prisma'), 'utf8');
const migration = readFileSync(
  join(root, 'prisma', 'migrations', '20260719140000_add_skill_request_board', 'migration.sql'),
  'utf8',
);
const sql = migration
  .split('\n')
  .map((line) => line.replace(/--[^\r\n]*\r?$/, ''))
  .join('\n')
  .toLowerCase();

test('migration is additive', () => {
  for (const token of ['drop table', 'drop column', 'truncate', 'delete from', '--force-reset']) {
    assert.equal(sql.includes(token), false, `migration contains ${token}`);
  }
});

test('migration creates the request board tables', () => {
  for (const table of ['SkillRequest', 'SkillRequestSupport', 'SkillRequestSolution']) {
    assert.match(migration, new RegExp(`CREATE TABLE "${table}"`));
  }
});

test('support and solution deduplication constraints exist', () => {
  assert.match(migration, /SkillRequestSupport_requestId_userId_key/);
  assert.match(migration, /SkillRequestSolution_requestId_postId_key/);
});

test('all request-board user and content relations define deletion behavior', () => {
  assert.match(migration, /SkillRequest_requesterId_fkey[\s\S]*ON DELETE CASCADE/);
  assert.match(migration, /SkillRequest_claimedById_fkey[\s\S]*ON DELETE SET NULL/);
  assert.match(migration, /SkillRequestSolution_postId_fkey[\s\S]*ON DELETE CASCADE/);
});

test('schema keeps public request text bounded to plain scalar fields', () => {
  const block = schema.match(/model SkillRequest \{([\s\S]*?)^\}/m)?.[1] ?? '';
  assert.match(block, /title\s+String/);
  assert.match(block, /description\s+String/);
  assert.match(block, /acceptanceCriteria\s+String/);
  assert.doesNotMatch(block, /Bytes|Json/);
});
