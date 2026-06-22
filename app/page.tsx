import Link from 'next/link';
import { getSessionUid } from '@/lib/session';
import { fetchFeed, hasAnyFilter, parseFeedQuery } from '@/lib/feed';
import { prisma } from '@/lib/db';
import { POST_STATUS } from '@/lib/status';
import { STAGE_GROUPS } from '@/lib/tags';
import { PostCard, type PostCardData } from '@/components/PostCard';
import { StageGroup } from '@/components/StageGroup';
import { FilterStrip } from '@/components/FilterStrip';
import { HomeHero } from '@/components/home/HomeHero';
import { HomeTaskGrid } from '@/components/home/HomeTaskGrid';
import { FeaturedWorkflows } from '@/components/home/FeaturedWorkflows';
import { HomeMcpFeature } from '@/components/home/HomeMcpFeature';

type SP = { [k: string]: string | string[] | undefined };

export default async function HomePage({ searchParams }: { searchParams: SP }) {
  const query = parseFeedQuery(searchParams);
  const uid = await getSessionUid();

  // 首页首屏统计全部来自真实数据；没有编辑精选字段时，以 workflow 类型作为可复用工作流数量。
  const [items, totalSkills, workflowCount] = await Promise.all([
    fetchFeed(query, uid),
    prisma.post.count({
      where: { status: POST_STATUS.PUBLISHED, skillAsset: { isNot: null } },
    }),
    prisma.post.count({
      where: {
        status: POST_STATUS.PUBLISHED,
        skillAsset: { is: { assetType: 'workflow' } },
      },
    }),
  ]);
  const hasFilter = hasAnyFilter(query);

  // 不筛选时：把内容按投资流程阶段分组（空组过滤掉）
  // 筛选时：保持单一 grid，让筛选结果连续呈现
  const groupedStages = !hasFilter
    ? STAGE_GROUPS.map((stage) => ({
        ...stage,
        items: items.filter((p) => (stage.scenes as readonly string[]).includes(p.tagScene)),
      })).filter((s) => s.items.length > 0)
    : [];

  return (
    <div>
      {!hasFilter ? (
        <>
          <HomeHero totalSkills={totalSkills} workflowCount={workflowCount} />
          <HomeTaskGrid />
          <FeaturedWorkflows />
          <HomeMcpFeature />
        </>
      ) : (
        <header className="pb-5 border-b border-paper-edge">
          <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-1">
            Skill Library
          </p>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <h1 className="font-serif text-3xl text-ink-brown">搜索与筛选 Skill</h1>
            <Link href="/" className="font-serif italic text-sm text-leather hover:text-wax-red">
              返回首页总览 →
            </Link>
          </div>
        </header>
      )}

      <section id="skill-library" className={hasFilter ? 'pt-6' : 'pt-2'}>
        {!hasFilter && (
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-5">
            <div>
              <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-1">
                Skill Library
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl text-ink-brown">继续探索 Skill Library</h2>
            </div>
            <p className="font-sans text-xs sm:text-sm text-sepia">
              按场景、类型、行业和热度浏览全部内容
            </p>
          </div>
        )}

        <FilterStrip />

        {items.length === 0 ? (
          <EmptyState query={query} />
        ) : groupedStages.length > 0 ? (
          // 不筛选：按投资流程阶段分组，每组最多9个，超出折叠
          <div className="space-y-10">
            {groupedStages.map((stage) => (
              <StageGroup
                key={stage.value}
                label={stage.label}
                stageValue={stage.value}
                items={stage.items}
                uid={uid}
              />
            ))}
          </div>
        ) : (
          // 筛选时：单一 grid，结果连续呈现
          <>
            {/* 搜索/筛选结果提示条 */}
            <div className="mb-4 flex items-baseline gap-2">
              {query.q ? (
                <p className="font-serif italic text-sm text-leather">
                  围绕 <span className="text-ink-brown not-italic">&ldquo;{query.q}&rdquo;</span>{' '}
                  搜到 <span className="num-osf text-ink-brown not-italic">{items.length}</span> 条
                </p>
              ) : (
                <p className="font-serif italic text-sm text-leather">
                  当前筛选 · 共 <span className="num-osf text-ink-brown not-italic">{items.length}</span> 条
                </p>
              )}
              <span className="flex-1 h-px bg-paper-edge" />
            </div>
            <PostGrid items={items} uid={uid} />
          </>
        )}

        {items.length > 0 && (
          <footer className="mt-10 pb-6 text-center">
            <p className="font-serif italic text-sm text-sepia">
              共 <span className="num-osf">{items.length}</span> 条
            </p>
          </footer>
        )}
      </section>
    </div>
  );
}

/** Feed 卡片网格（阶段组内 + 筛选结果共用） */
function PostGrid({ items, uid }: { items: PostCardData[]; uid: number | null }) {
  return (
    <ol className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map((p, i) => (
        <li key={p.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i * 40, 320)}ms` }}>
          <PostCard post={p} currentUserId={uid} variant="compact" />
        </li>
      ))}
    </ol>
  );
}

/* —— 空状态 —— */
function EmptyState({ query }: { query: { q?: string; scene?: string; industry?: string; skill?: string; role?: string; time?: string; contentList?: string[] } }) {
  const hasQ = !!query.q;
  const hasFilter = !!(query.scene || query.industry || query.skill || query.role || query.time || query.contentList?.length);
  return (
    <div className="border border-paper-edge bg-vellum rounded-md py-16 px-8 text-center">
      <div className="flex justify-center mb-6 text-paper-edge">
        <EnvelopeSeal />
      </div>
      <p className="font-serif italic text-leather text-lg mb-2">
        {hasQ ? <>没找到与「{query.q}」相关的内容</> : hasFilter ? '当前筛选下没有内容' : '这里还没有内容'}
      </p>
      <p className="font-sans text-sm text-sepia">
        {hasQ ? '换个关键词，或清空搜索看看全部' : hasFilter ? '试试调整或清空筛选' : '来分享第一个 Skill 吧'}
      </p>
      <div className="mt-6">
        {hasQ || hasFilter ? (
          <Link
            href="/"
            className="inline-flex items-center h-9 px-4 border border-ink-brown text-ink-brown hover:bg-ink-brown hover:text-vellum font-serif text-sm rounded-sm transition-colors"
          >
            清空 · 显示全部
          </Link>
        ) : (
          <Link
            href="/publish"
            className="inline-flex items-center h-9 px-4 bg-ink-brown text-vellum hover:bg-wax-red font-serif text-sm rounded-sm transition-colors"
          >
            分享第一个
          </Link>
        )}
      </div>
    </div>
  );
}

function EnvelopeSeal() {
  return (
    <svg width="80" height="60" viewBox="0 0 80 60" fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="10" width="68" height="44" />
      <path d="M6 10 L40 36 L74 10" />
      <circle cx="40" cy="42" r="7" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="40" cy="42" r="3" stroke="currentColor" strokeWidth="0.8" />
    </svg>
  );
}
