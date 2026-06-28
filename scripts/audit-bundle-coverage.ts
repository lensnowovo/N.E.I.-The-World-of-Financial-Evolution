import { prisma } from '../lib/db';
import { taskBundles } from '../lib/bundles';

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function safeJsonArray(raw: string | null): string[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function scoreBundlePost(post: any, keywords: string[]) {
  const tagContent = safeJsonArray(post.tagContent).join(' ');
  const text = [
    post.title,
    stripHtml(post.body),
    post.tagScene,
    post.tagIndustry,
    post.tagSkill,
    post.skillAsset?.assetType,
    post.skillAsset?.originalAuthor,
    tagContent,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return keywords.reduce((score, keyword) => {
    const token = keyword.toLowerCase();
    if (!token) return score;
    if (String(post.title).toLowerCase().includes(token)) return score + 8;
    return text.includes(token) ? score + 3 : score;
  }, 0);
}

async function main() {
  for (const bundle of taskBundles) {
    const posts = await prisma.post.findMany({
      where: {
        status: 'published',
        deletedAt: null,
        tagScene: { in: bundle.scenes },
      },
      include: {
        skillAsset: true,
        _count: { select: { stars: true, comments: true, attachments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 120,
    });

    const usedIds = new Set<number>();
    let total = 0;

    console.log(`\n${bundle.slug} | ${bundle.shortTitle} | pool=${posts.length}`);
    for (const step of bundle.steps) {
      const matches = posts
        .filter((post) => !usedIds.has(post.id))
        .map((post) => ({ post, score: scoreBundlePost(post, step.skillQueries) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      matches.forEach((match) => usedIds.add(match.post.id));
      total += matches.length;

      console.log(`  - ${step.title}: ${matches.length}`);
      for (const match of matches) {
        console.log(`      #${match.post.id} [${match.score}] ${match.post.title}`);
      }
    }
    console.log(`  => selected=${total}/${bundle.steps.length * 3}`);
  }

  const counts = await prisma.post.groupBy({
    by: ['tagScene'],
    where: { status: 'published', deletedAt: null },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });
  console.log('\nScene counts');
  for (const row of counts) console.log(`${row.tagScene}: ${row._count.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
