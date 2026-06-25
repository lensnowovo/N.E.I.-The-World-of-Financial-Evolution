import Link from 'next/link';
import { prisma } from '@/lib/db';
import { POST_STATUS } from '@/lib/status';
import { stripHtml } from '@/lib/validate';
import { sceneLabel, contentLabel, skillLabel } from '@/lib/tags';
import { SkillIcon } from '@/components/icons/SkillIcon';

const MAX_FEATURED = 6;
const EXCERPT_LEN = 100;

type FeaturedPost = {
  id: number;
  title: string;
  body: string;
  tagScene: string;
  tagContent: string;
  tagSkill: string | null;
};

async function getFeaturedPosts(): Promise<FeaturedPost[]> {
  const rows = await prisma.post.findMany({
    where: {
      featured: true,
      deletedAt: null,
      status: POST_STATUS.PUBLISHED,
    },
    select: {
      id: true,
      title: true,
      body: true,
      tagScene: true,
      tagContent: true,
      tagSkill: true,
    },
    orderBy: [{ featuredOrder: 'asc' }, { createdAt: 'desc' }],
    take: MAX_FEATURED,
  });
  return rows;
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
          <h2 className="font-serif text-2xl sm:text-3xl text-ink-brown">精选 PEVC Skill</h2>
        </div>
        <Link href="/" className="font-serif italic text-sm text-leather hover:text-wax-red">
          浏览全部 Skill →
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="mt-6 border border-dashed border-paper-edge bg-vellum rounded-md p-10 text-center">
          <p className="font-serif text-base text-leather">暂无精选工作流</p>
          <p className="mt-1 font-sans text-xs text-sepia">管理员精选后将在此展示。</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {posts.map((post) => {
            const skill = post.tagSkill ?? 'workflow';
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
