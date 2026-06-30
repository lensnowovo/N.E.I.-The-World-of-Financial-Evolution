import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/db';
import { POST_STATUS } from '@/lib/status';
import {
  canGenerateMarkdown,
  fileCachePath,
  loadEnvFile,
  markdownFromHtml,
  uploadsPath,
} from './file-cache-utils';

loadEnvFile('.env');
loadEnvFile('.env.local');

const force = process.argv.includes('--force');

async function main() {
  const attachments = await prisma.attachment.findMany({
    where: {
      postId: { not: null },
      post: { status: POST_STATUS.PUBLISHED, deletedAt: null },
    },
    include: {
      post: {
        select: {
          title: true,
          body: true,
        },
      },
    },
    orderBy: { id: 'asc' },
  });

  fs.mkdirSync(path.join(process.cwd(), 'public', 'file-cache'), { recursive: true });

  let copied = 0;
  let generated = 0;
  let skipped = 0;
  const failures: Array<{ id: number; fileName: string; reason: string }> = [];

  for (const attachment of attachments) {
    if (!attachment.post) continue;

    const target = fileCachePath(attachment.storageKey);
    if (!force && fs.existsSync(target)) {
      skipped += 1;
      continue;
    }

    const localUpload = uploadsPath(attachment.storageKey);
    if (fs.existsSync(localUpload)) {
      fs.copyFileSync(localUpload, target);
      copied += 1;
      continue;
    }

    if (canGenerateMarkdown(attachment.fileName)) {
      const markdown = markdownFromHtml(attachment.post.title, attachment.post.body);
      if (markdown) {
        fs.writeFileSync(target, markdown, 'utf8');
        generated += 1;
        continue;
      }
    }

    failures.push({ id: attachment.id, fileName: attachment.fileName, reason: 'no upload file and cannot generate markdown' });
  }

  console.log(JSON.stringify({ checked: attachments.length, copied, generated, skipped, failures }, null, 2));
  if (failures.length > 0) process.exit(1);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
