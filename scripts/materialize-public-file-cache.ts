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
const sourceOnly = process.argv.includes('--source-only');

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
          skillAsset: { select: { sourceUrl: true } },
        },
      },
    },
    orderBy: { id: 'asc' },
  });

  fs.mkdirSync(path.join(process.cwd(), 'public', 'file-cache'), { recursive: true });

  let copied = 0;
  let fetchedFromSource = 0;
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

    const rawSourceUrl = githubBlobToRawUrl(attachment.post.skillAsset?.sourceUrl);
    if (rawSourceUrl && canGenerateMarkdown(attachment.fileName)) {
      try {
        const response = await fetch(rawSourceUrl, {
          headers: { 'User-Agent': 'nei-pevc-file-cache-materializer' },
        });
        if (!response.ok) throw new Error(`upstream returned ${response.status}`);

        const source = Buffer.from(await response.arrayBuffer());
        if (source.length === 0) throw new Error('upstream returned an empty file');
        fs.writeFileSync(target, source);
        fetchedFromSource += 1;
        continue;
      } catch (error) {
        failures.push({
          id: attachment.id,
          fileName: attachment.fileName,
          reason: `cannot fetch canonical source: ${error instanceof Error ? error.message : String(error)}`,
        });
        continue;
      }
    }

    if (sourceOnly) {
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

  console.log(
    JSON.stringify({ checked: attachments.length, copied, fetchedFromSource, generated, skipped, failures }, null, 2),
  );
  if (failures.length > 0) process.exit(1);
}

function githubBlobToRawUrl(sourceUrl: string | null | undefined): string | null {
  if (!sourceUrl) return null;

  try {
    const url = new URL(sourceUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'github.com') return null;

    const match = url.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/);
    if (!match) return null;
    const [, owner, repo, ref, filePath] = match;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${filePath}`;
  } catch {
    return null;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
