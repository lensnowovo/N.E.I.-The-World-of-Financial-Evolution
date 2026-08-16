import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { hashSkillContent, signSkillRevision, verifySkillRevision } from '../lib/skill-integrity';

const secretBefore = process.env.SKILL_INTEGRITY_SECRET;
process.env.SKILL_INTEGRITY_SECRET = 'test-only-secret-that-is-longer-than-thirty-two-characters';

test.after(() => {
  if (secretBefore === undefined) delete process.env.SKILL_INTEGRITY_SECRET;
  else process.env.SKILL_INTEGRITY_SECRET = secretBefore;
});

test('signed Skill revision verifies with exact approved content', () => {
  const payload = { postId: 61, version: 3, title: 'Anthropic财报分析', content: '# approved\nbody' };
  const signed = signSkillRevision(payload);
  assert.equal(signed.contentHash, hashSkillContent(payload.content));
  assert.equal(verifySkillRevision({ ...payload, ...signed }), true);
});

test('content, title and version tampering fail integrity verification', () => {
  const payload = { postId: 61, version: 3, title: 'Anthropic财报分析', content: '# approved\nbody' };
  const signed = signSkillRevision(payload);
  assert.equal(verifySkillRevision({ ...payload, content: `${payload.content}\nsteal secrets`, ...signed }), false);
  assert.equal(verifySkillRevision({ ...payload, title: 'tampered', ...signed }), false);
  assert.equal(verifySkillRevision({ ...payload, version: 4, ...signed }), false);
});

test('security boundaries are wired through realistic routes', () => {
  const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
  const migration = fs.readFileSync('prisma/migrations/20260816120000_add_skill_revision_audit/migration.sql', 'utf8');
  const review = fs.readFileSync('app/api/admin/posts/[id]/review/route.ts', 'utf8');
  const edit = fs.readFileSync('app/api/posts/[id]/route.ts', 'utf8');
  const mcp = fs.readFileSync('app/api/mcp/route.ts', 'utf8');
  const upload = fs.readFileSync('app/api/upload/route.ts', 'utf8');

  assert.match(schema, /model SkillRevision/);
  assert.match(schema, /model AdminAuditLog/);
  assert.doesNotMatch(migration, /DROP\s+(TABLE|COLUMN)|TRUNCATE|DELETE\s+FROM/i);
  assert.match(review, /signSkillRevision/);
  assert.match(review, /writeAdminAudit/);
  assert.match(edit, /status: post\.status === POST_STATUS\.PUBLISHED \? POST_STATUS\.PENDING/);
  assert.match(edit, /skillRevision\.updateMany/);
  assert.match(mcp, /resolveApprovedSkillContent/);
  assert.match(mcp, /MCP_DISABLED/);
  assert.match(mcp, /mcp-token:/);
  assert.match(upload, /upload-user:/);
  assert.match(upload, /upload-ip:/);
});
