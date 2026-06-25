import fs from 'node:fs';
import path from 'node:path';

type Failure = {
  id: number;
  title: string;
  reason: string;
};

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i];
  const value = process.argv[i + 1];
  if (key?.startsWith('--') && value) args.set(key.slice(2), value);
}

const baseUrl = args.get('base') || process.env.SMOKE_BASE_URL || '';
const limit = Number(args.get('limit') || '0');
let disconnectPrisma: null | (() => Promise<void>) = null;

loadEnvFile('.env');
loadEnvFile('.env.local');

async function main() {
  const [{ prisma }, { POST_STATUS }, { stripHtml }] = await Promise.all([
    import('@/lib/db'),
    import('@/lib/status'),
    import('@/lib/validate'),
  ]);
  disconnectPrisma = () => prisma.$disconnect();

  const posts = await prisma.post.findMany({
    where: { status: POST_STATUS.PUBLISHED, deletedAt: null },
    select: {
      id: true,
      title: true,
      body: true,
      tagScene: true,
      skillAsset: { select: { assetType: true } },
    },
    orderBy: { id: 'asc' },
    take: limit > 0 ? limit : undefined,
  });

  const failures: Failure[] = [];

  for (const post of posts) {
    const title = post.title || `#${post.id}`;
    const plain = stripHtml(post.body || '').trim();

    if (!post.title.trim()) failures.push({ id: post.id, title, reason: 'missing title' });
    if (plain.length < 20) failures.push({ id: post.id, title, reason: 'body too short or blank' });
    if (!post.tagScene) failures.push({ id: post.id, title, reason: 'missing tagScene' });
    if (!post.skillAsset?.assetType) failures.push({ id: post.id, title, reason: 'missing skillAsset.assetType' });

    if (baseUrl) {
      const url = `${baseUrl.replace(/\/+$/, '')}/posts/${post.id}`;
      const res = await fetch(url, { redirect: 'manual' });
      if (!res.ok) {
        failures.push({ id: post.id, title, reason: `detail page HTTP ${res.status}` });
        continue;
      }
      const html = await res.text();
      if (!html.includes(post.title)) failures.push({ id: post.id, title, reason: 'detail page missing title' });
      if (!/Skill Quality/i.test(html)) failures.push({ id: post.id, title, reason: 'detail page missing Skill Quality panel' });
      if (html.length < 2000) failures.push({ id: post.id, title, reason: 'detail page suspiciously short' });
      if (post.skillAsset?.assetType === 'prompt' && !/(复制|Copy|copy|澶嶅埗)/.test(html)) {
        failures.push({ id: post.id, title, reason: 'prompt detail missing copy affordance' });
      }
    }
  }

  if (failures.length > 0) {
    console.error(`Public post smoke failed: ${failures.length} issue(s) across ${posts.length} checked post(s).`);
    for (const failure of failures.slice(0, 50)) {
      console.error(`#${failure.id} ${failure.title} — ${failure.reason}`);
    }
    if (failures.length > 50) console.error(`...and ${failures.length - 50} more`);
    process.exit(1);
  }

  console.log(`Public post smoke passed: ${posts.length} post(s) checked${baseUrl ? ` against ${baseUrl}` : ' (DB-only)'}.`);
}

function loadEnvFile(fileName: string) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectPrisma?.();
  });
