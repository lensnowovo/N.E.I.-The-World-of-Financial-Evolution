import { prisma } from '@/lib/db';
import { requireSignedSkillRevisions, verifySkillRevision } from '@/lib/skill-integrity';

export class SkillIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkillIntegrityError';
  }
}

/**
 * Resolve the exact content approved for MCP distribution.
 *
 * During rollout, legacy approved posts without snapshots may use fallback(). Once production
 * backfill is complete, MCP_REQUIRE_SIGNED_REVISIONS=true makes a missing snapshot fail closed.
 */
export async function resolveApprovedSkillContent(input: {
  postId: number;
  version: number;
  title: string;
  fallback: () => Promise<string>;
  revision?: {
    title: string;
    content: string;
    contentHash: string;
    signature: string;
    revokedAt: Date | null;
  } | null;
}): Promise<{ content: string; signed: boolean; contentHash: string | null }> {
  const revision = input.revision === undefined
    ? await prisma.skillRevision.findUnique({
        where: { postId_version: { postId: input.postId, version: input.version } },
      })
    : input.revision;

  if (!revision || revision.revokedAt) {
    if (requireSignedSkillRevisions()) {
      throw new SkillIntegrityError('Approved Skill snapshot is missing or revoked');
    }
    return { content: await input.fallback(), signed: false, contentHash: null };
  }

  let valid = false;
  try {
    valid = verifySkillRevision({
      postId: input.postId,
      version: input.version,
      title: input.title,
      content: revision.content,
      contentHash: revision.contentHash,
      signature: revision.signature,
    });
  } catch {
    valid = false;
  }
  if (!valid || revision.title !== input.title) {
    throw new SkillIntegrityError('Approved Skill snapshot failed integrity verification');
  }
  return { content: revision.content, signed: true, contentHash: revision.contentHash };
}
