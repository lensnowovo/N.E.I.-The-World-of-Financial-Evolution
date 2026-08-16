import crypto from 'node:crypto';

export type SkillRevisionPayload = {
  postId: number;
  version: number;
  title: string;
  content: string;
};

function integritySecret(): string {
  const secret = process.env.SKILL_INTEGRITY_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error('SKILL_INTEGRITY_SECRET must be configured with at least 32 characters');
  }
  return secret;
}

function canonicalPayload(payload: SkillRevisionPayload, contentHash: string): string {
  return JSON.stringify({
    postId: payload.postId,
    version: payload.version,
    title: payload.title,
    contentHash,
  });
}

export function hashSkillContent(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export function signSkillRevision(payload: SkillRevisionPayload): {
  contentHash: string;
  signature: string;
} {
  const contentHash = hashSkillContent(payload.content);
  const signature = crypto
    .createHmac('sha256', integritySecret())
    .update(canonicalPayload(payload, contentHash), 'utf8')
    .digest('base64url');
  return { contentHash, signature };
}

export function verifySkillRevision(
  payload: SkillRevisionPayload & { contentHash: string; signature: string },
): boolean {
  const actualHash = hashSkillContent(payload.content);
  if (actualHash !== payload.contentHash) return false;
  const expected = crypto
    .createHmac('sha256', integritySecret())
    .update(canonicalPayload(payload, actualHash), 'utf8')
    .digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(payload.signature, 'base64url');
  } catch {
    return false;
  }
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

export function requireSignedSkillRevisions(): boolean {
  return process.env.MCP_REQUIRE_SIGNED_REVISIONS === 'true';
}
