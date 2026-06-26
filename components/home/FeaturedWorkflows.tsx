import Link from 'next/link';
import { prisma } from '@/lib/db';
import { POST_STATUS } from '@/lib/status';
import { stripHtml } from '@/lib/validate';
import { sceneLabel, contentLabel, skillLabel } from '@/lib/tags';
import { SkillIcon } from '@/components/icons/SkillIcon';
import { analyzeSkillQuality } from '@/lib/skill-quality';
import { SkillQualityBadge } from '@/components/SkillQualityPanel';

const MAX_FEATURED = 6;
const EXCERPT_LEN = 100;
const MIN_HOME_QUALITY_SCORE = 80;
const MIN_FALLBACK_QUALITY_SCORE = 75;

type FeaturedPost = {
  id: number;
  title: string;
  body: string;
  tagScene: string;
  tagContent: string;
  tagSkill: string | null;
  skillAsset: {
    assetType: string;
    sourceUrl: string | null;
    installHint: string | null;
    usageNotes: string | null;
  } | null;
  _count: { attachments: number };
  featured: boolean;
  mcpApproved: boolean;
  qualityScore: number;
  qualityLevel: string;
};

async function getFeaturedPosts(): Promise<FeaturedPost[]> {
  const curatedRows = await prisma.post.findMany({
    where: {
      featured: true,
      deletedAt: null,
      status: POST_STATUS.PUBLISHED,
      skillAsset: { isNot: null },
    },
    select: {
      id: true,
      title: true,
      body: true,
      tagScene: true,
      tagContent: true,
      tagSkill: true,
      featured: true,
      mcpApproved: true,
      skillAsset: {
        select: {
          assetType: true,
          sourceUrl: true,
          installHint: true,
          usageNotes: true,
        },
      },
      _count: { select: { attachments: true } },
    },
    orderBy: [{ featuredOrder: 'asc' }, { createdAt: 'desc' }],
    take: MAX_FEATURED * 3,
  });

  const curatedPosts = withQuality(curatedRows)
    .filter((post) => post.qualityScore >= MIN_HOME_QUALITY_SCORE)
    .slice(0, MAX_FEATURED);

  if (curatedPosts.length >= MAX_FEATURED) return curatedPosts;

  const fallbackRows = await prisma.post.findMany({
    where: {
      featured: false,
      deletedAt: null,
      status: POST_STATUS.PUBLISHED,
      mcpApproved: true,
      skillAsset: { isNot: null },
      id: { notIn: curatedPosts.map((post) => post.id) },
    },
    select: {
      id: true,
      title: true,
      body: true,
      tagScene: true,
      tagContent: true,
      tagSkill: true,
      featured: true,
      mcpApproved: true,
      skillAsset: {
        select: {
          assetType: true,
          sourceUrl: true,
          installHint: true,
          usageNotes: true,
        },
      },
      _count: { select: { attachments: true } },
    },
    orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
    take: MAX_FEATURED * 4,
  });

  const fallbackPosts = withQuality(fallbackRows)
    .filter((post) => post.qualityScore >= MIN_FALLBACK_QUALITY_SCORE)
    .slice(0, MAX_FEATURED - curatedPosts.length);

  return [...curatedPosts, ...fallbackPosts];
}

function withQuality(
  rows: Array<Omit<FeaturedPost, 'qualityScore' | 'qualityLevel'>>,
): FeaturedPost[] {
  return rows
    .map((post) => {
      const quality = analyzeSkillQuality({
        title: post.title,
        body: post.body,
        tagScene: post.tagScene,
        tagContent: parseContentTags(post.tagContent),
        tagSkill: post.tagSkill,
        assetType: post.skillAsset?.assetType ?? null,
        attachmentsCount: post._count.attachments,
        sourceUrl: post.skillAsset?.sourceUrl ?? null,
        installHint: post.skillAsset?.installHint ?? null,
        usageNotes: post.skillAsset?.usageNotes ?? null,
      });
      return { ...post, qualityScore: quality.score, qualityLevel: quality.level };
    });
}

function parseContentTags(raw: string): string[] {
  try {
    const arr = JSON.parse(raw || '[]');
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is string => typeof x === 'string');
  } catch {
    return [];
  }
}

export async function FeaturedWorkflows() {
  const posts = await getFeaturedPosts();

  return (
    <section className="py-10 sm:py-12 border-b border-paper-edge">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-1">
            Curated Skills
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl text-ink-brown">精选 PEVC Skill / Workflow</h2>
        </div>
        <Link href="#skill-library" className="font-serif italic text-sm text-leather hover:text-wax-red">
          继续浏览 Skill Library →
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="mt-6 border border-dashed border-paper-edge bg-vellum rounded-md p-10 text-center">
          <p className="font-serif text-base text-leather">暂无达到精选标准的内容</p>
          <p className="mt-1 font-sans text-xs text-sepia">首页优先展示管理员精选；空位由高质量 MCP Ready 内容补足。</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {posts.map((post) => {
            const skill = post.skillAsset?.assetType ?? post.tagSkill ?? 'workflow';
            const tags = parseContentTags(post.tagContent).slice(0, 3);
            return (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                className="group flex min-h-48 flex-col border border-paper-edge bg-vellum p-5 rounded-md hover:border-sepia hover:shadow-card transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 font-sans text-[11px] text-wax-red">
                    <SkillIcon skill={skill} className="h-3.5 w-3.5" />
                    {sceneLabel(post.tagScene)}
                  </span>
                  <span className="font-mono text-[9px] text-sepia">{skillLabel(skill)}</span>
                </div>
                <div className="mt-2">
                  <SkillQualityBadge score={post.qualityScore} level={post.qualityLevel} />
                  {post.featured && (
                    <span className="ml-1.5 inline-flex items-center rounded-sm border border-gilded/50 bg-gilded/10 px-1.5 py-0.5 font-sans text-[10px] text-ink-brown">
                      精选
                    </span>
                  )}
                  {!post.featured && post.mcpApproved && (
                    <span className="ml-1.5 inline-flex items-center rounded-sm border border-moss/40 bg-moss/5 px-1.5 py-0.5 font-sans text-[10px] text-moss">
                      MCP Ready
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-serif text-xl text-ink-brown group-hover:text-wax-red transition-colors">
                  {post.title}
                </h3>
                <p className="mt-1.5 font-sans text-xs leading-5 text-leather flex-1">
                  {stripHtml(post.body).slice(0, EXCERPT_LEN)}
                </p>
                {tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="border border-paper-edge px-2 py-0.5 font-sans text-[10px] text-sepia rounded-full"
                      >
                        {contentLabel(tag)}
                      </span>
                    ))}
                  </div>
                )}
                <span className="mt-4 pt-3 border-t border-paper-edge font-serif italic text-xs text-sepia group-hover:text-ink-brown">
                  阅读全文 →
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
