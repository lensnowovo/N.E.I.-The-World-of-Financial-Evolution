import fs from 'node:fs';
import { prisma } from '@/lib/db';
import { POST_STATUS } from '@/lib/status';
import { fileCachePath, loadEnvFile } from './file-cache-utils';

loadEnvFile('.env');
loadEnvFile('.env.local');

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i];
  const value = process.argv[i + 1];
  if (key?.startsWith('--') && value) args.set(key.slice(2), value);
}

const baseUrl = args.get('base') || process.env.SMOKE_BASE_URL || '';

type Failure = {
  id: number;
  fileName: string;
  reason: string;
};

async function main() {
  const attachments = await prisma.attachment.findMany({
    where: {
      postId: { not: null },
      post: { status: POST_STATUS.PUBLISHED, deletedAt: null },
    },
    select: {
      id: true,
      fileName: true,
      storageKey: true,
    },
    orderBy: { id: 'asc' },
  });

  const failures: Failure[] = [];

  for (const attachment of attachments) {
    if (!fs.existsSync(fileCachePath(attachment.storageKey))) {
      failures.push({ id: attachment.id, fileName: attachment.fileName, reason: 'missing public/file-cache object' });
      continue;
    }

    if (baseUrl) {
      const url = `${baseUrl.replace(/\/+$/, '')}/api/files/${attachment.id}/download`;
      const res = await fetch(url, { redirect: 'manual' });
      if (!res.ok) {
        failures.push({ id: attachment.id, fileName: attachment.fileName, reason: `download HTTP ${res.status}` });
      }
    }
  }

  if (failures.length > 0) {
    console.error(`Public download smoke failed: ${failures.length} issue(s) across ${attachments.length} attachment(s).`);
    for (const failure of failures.slice(0, 50)) {
      console.error(`#${failure.id} ${failure.fileName} — ${failure.reason}`);
    }
    if (failures.length > 50) console.error(`...and ${failures.length - 50} more`);
    process.exit(1);
  }

  console.log(`Public download smoke passed: ${attachments.length} attachment(s) checked${baseUrl ? ` against ${baseUrl}` : ' (static cache only)'}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
