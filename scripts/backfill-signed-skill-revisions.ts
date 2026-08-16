import { prisma } from '@/lib/db';
import { readCanonicalSkillContent } from '@/lib/canonical-skill-content';
import { extractPlainText, extractReadableText } from '@/lib/skill-text';
import { normalizePublicText } from '@/lib/public-url';
import { signSkillRevision } from '@/lib/skill-integrity';
import { POST_STATUS } from '@/lib/status';

async function main() {
  const adminEmail = process.env.SKILL_BACKFILL_ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) throw new Error('SKILL_BACKFILL_ADMIN_EMAIL is required');
  const admin = await prisma.user.findUnique({ where: { email: adminEmail }, select: { id: true, isAdmin: true } });
  if (!admin?.isAdmin) throw new Error('SKILL_BACKFILL_ADMIN_EMAIL must identify an administrator');

  const posts = await prisma.post.findMany({
    where: { status: POST_STATUS.PUBLISHED, deletedAt: null, mcpApproved: true },
    include: {
      skillAsset: { select: { assetType: true } },
      attachments: {
        orderBy: { createdAt: 'asc' },
        select: { fileName: true, mimeType: true, storageKey: true },
      },
    },
    orderBy: { id: 'asc' },
  });

  let created = 0;
  let skipped = 0;
  for (const post of posts) {
    const existing = await prisma.skillRevision.findUnique({
      where: { postId_version: { postId: post.id, version: post.version } },
      select: { id: true },
    });
    if (existing) {
      skipped += 1;
      continue;
    }
    const fallback = normalizePublicText(
      post.skillAsset?.assetType === 'agent-discipline'
        ? extractReadableText(post.body)
        : extractPlainText(post.body),
    );
    const content = normalizePublicText(await readCanonicalSkillContent(post.attachments, fallback));
    const signed = signSkillRevision({ postId: post.id, version: post.version, title: post.title, content });
    await prisma.$transaction(async (tx) => {
      await tx.skillRevision.updateMany({
        where: { postId: post.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.skillRevision.create({
        data: {
          postId: post.id,
          version: post.version,
          title: post.title,
          content,
          contentHash: signed.contentHash,
          signature: signed.signature,
          approvedById: admin.id,
        },
      });
      await tx.adminAuditLog.create({
        data: {
          actorUserId: admin.id,
          action: 'skill.revision.backfill',
          entityType: 'post',
          entityId: String(post.id),
          afterState: { version: post.version, contentHash: signed.contentHash },
        },
      });
    });
    created += 1;
    console.log(`snapshotted post ${post.id} v${post.version}`);
  }
  console.log(JSON.stringify({ total: posts.length, created, skipped }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
