import Link from 'next/link';
import type { TaskMap } from '@/lib/task-maps';
import type { TaskMapData } from '@/lib/task-map-posts';
import type { PostCardData } from '@/lib/types';
import { PostCard } from '@/components/PostCard';
import { ChapterRule } from '@/components/icons/ChapterRule';
import { Ornament } from '@/components/icons/Ornament';

export function HomeTaskMap({
  task,
  data,
  currentUserId,
}: {
  task: TaskMap;
  data: TaskMapData;
  currentUserId: number | null;
}) {
  const sceneQuery = task.scenes[0] ? `scene=${encodeURIComponent(task.scenes[0])}` : '';
  const sections = data.unassigned.length > 0
    ? [
        ...data.intents,
        {
          intent: {
            slug: 'new-arrivals',
            title: '新收录，等待整理',
            description: '这些内容已经进入当前任务目录，稍后会归入更准确的工作分支。',
            postIds: data.unassigned.map((post) => post.id),
          },
          items: data.unassigned,
        },
      ]
    : data.intents;

  return (
    <div>
      <header className="relative border-b border-paper-edge pb-8 pt-2 sm:pb-9">
        <div
          className="pointer-events-none absolute bottom-0 left-1/2 top-1 hidden max-w-none -translate-x-1/2 blur-[9px]"
          style={{
            width: 'min(1440px, calc(100vw - 2rem))',
            background:
              'radial-gradient(ellipse at 48% 42%, rgba(250, 246, 236, 0.94) 0%, rgba(248, 242, 229, 0.82) 38%, rgba(245, 236, 217, 0.48) 62%, rgba(233, 217, 188, 0.1) 78%, transparent 96%)',
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/2 top-0 max-w-none -translate-x-1/2"
          style={{
            width: 'calc(100vw - 2rem)',
            background:
              'linear-gradient(to bottom, transparent 0%, rgba(247, 241, 227, 0.4) 10%, rgba(247, 241, 227, 0.4) 90%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, #000 12%, #000 88%, transparent 100%)',
            maskImage:
              'linear-gradient(to right, transparent 0%, #000 12%, #000 88%, transparent 100%)',
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-8 top-8 hidden select-none font-display text-[clamp(4.5rem,9vw,8.5rem)] uppercase leading-none tracking-[0.12em] lg:block"
          style={{ color: 'rgba(96, 73, 42, 0.035)' }}
          aria-hidden="true"
        >
          {task.slug.replace(/-/g, ' ')}
        </div>

        <div className="relative flex items-center justify-between gap-4">
          <Link
            href="/#task-map"
            className="inline-flex font-serif italic text-sm text-sepia transition-colors hover:text-ink-brown"
          >
            ← 回到今日任务
          </Link>
          <p className="hidden font-mono text-[9px] tracking-[0.22em] text-sepia/45 sm:block">
            TASK DESK / {task.slug.toUpperCase()}
          </p>
        </div>

        <div className="relative mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-stretch">
          <div className="flex min-h-[190px] flex-col justify-center lg:pr-8">
            <div className="flex items-center gap-3">
              <Ornament className="h-4 w-20 text-gilded" />
              <p className="font-display text-[10px] uppercase tracking-display text-sepia">
                Investment Workbench · 投资工作台
              </p>
            </div>
            <h1 className="mt-4 max-w-4xl font-serif text-[clamp(2.65rem,4.6vw,4.8rem)] leading-[0.98] tracking-[-0.035em] text-ink-brown">
              {task.title}
            </h1>
            <p className="mt-4 max-w-3xl border-l-2 border-gilded/55 pl-4 font-sans text-sm leading-6 text-leather sm:text-base">
              {task.description}
            </p>
          </div>

          <aside className="relative overflow-hidden border border-gilded/30 bg-vellum/55 p-5 shadow-[0_18px_45px_rgba(69,49,29,0.06)] backdrop-blur-[2px]">
            <span className="absolute left-0 top-0 h-px w-16 bg-gilded/80" aria-hidden="true" />
            <span className="absolute left-0 top-0 h-16 w-px bg-gilded/80" aria-hidden="true" />
            <div className="flex items-center justify-between border-b border-gilded/20 pb-3">
              <p className="font-display text-[9px] uppercase tracking-display text-sepia">Task Brief</p>
              <span className="font-mono text-[9px] text-gilded">NO. {String(task.intents.length).padStart(2, '0')}</span>
            </div>
            <dl className="mt-4 space-y-4">
              <div>
                <dt className="font-display text-[9px] uppercase tracking-display text-sepia">当前目录</dt>
                <dd className="mt-1 flex items-baseline gap-2 text-ink-brown">
                  <span className="font-serif text-3xl leading-none">{data.total}</span>
                  <span className="font-serif text-base italic text-sepia">个相关 Skill</span>
                </dd>
              </div>
              <div>
                <dt className="font-display text-[9px] uppercase tracking-display text-sepia">常见产出</dt>
                <dd className="mt-2 font-sans text-xs leading-6 text-leather">{task.outcome}</dd>
              </div>
            </dl>
            <p className="absolute bottom-3 right-4 font-mono text-[8px] uppercase tracking-[0.16em] text-sepia/25">
              N.E.I. / WORK INDEX
            </p>
          </aside>
        </div>

        <ChapterRule className="relative mt-5" />

        <div className="relative mt-3">
          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="font-display text-[9px] uppercase tracking-display text-sepia">Working Index</p>
              <h2 className="mt-0.5 font-serif text-xl text-ink-brown sm:text-2xl">你现在具体要完成什么？</h2>
            </div>
            <p className="hidden max-w-sm text-right font-sans text-xs leading-5 text-leather md:block">
              选择手头的具体工作，直接落到对应方法和工具。
            </p>
          </div>

          <nav aria-label="工作分支" className="mt-3">
            <ol className="grid grid-cols-1 overflow-hidden border-y border-gilded/30 bg-vellum/30 sm:grid-cols-2 lg:grid-cols-3">
              {task.intents.map((intent, index) => (
                <li
                  key={intent.slug}
                  className="border-b border-gilded/20 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 sm:[&:nth-child(odd)]:border-r lg:border-b-0 lg:[&:nth-child(n)]:border-r lg:[&:nth-child(3n)]:border-r-0"
                >
                  <a
                    href={`#${intent.slug}`}
                    className="group relative flex min-h-[84px] items-center gap-4 overflow-hidden px-5 py-3 transition-colors duration-300 hover:bg-vellum/85"
                  >
                    <span
                      className="absolute inset-y-0 left-0 w-px origin-center scale-y-0 bg-gilded transition-transform duration-300 group-hover:scale-y-100"
                      aria-hidden="true"
                    />
                    <span className="font-mono text-[10px] text-gilded/85">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1 font-serif text-base leading-6 text-ink-brown transition-transform duration-300 group-hover:translate-x-1 group-hover:text-wax-red sm:text-lg">
                      {intent.title}
                    </span>
                    <span className="translate-x-1 font-serif text-sm text-gilded opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true">
                      →
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        <div className="relative mt-4 flex items-center justify-between gap-4">
          <p className="font-sans text-xs leading-5 text-leather">
            选定任务后，沿左侧导轨继续向下浏览。
          </p>
          <Link
            href={sceneQuery ? `/?${sceneQuery}#skill-library` : '/#skill-library'}
            className="shrink-0 font-serif italic text-sm text-sepia transition-colors hover:text-wax-red"
          >
            浏览完整分类 →
          </Link>
        </div>
      </header>

      <section aria-label={`${task.title}工作分支`} className="py-8 sm:py-10">
        <div className="relative ml-1 space-y-12 pl-10 sm:space-y-14 sm:pl-14">
          <div className="absolute bottom-2 left-[4px] top-2 w-[5px] bg-gilded/15 blur-[2px]" aria-hidden="true" />
          <div className="absolute bottom-2 left-[6px] top-2 w-px bg-[rgba(168,131,57,0.62)] shadow-[0_0_4px_rgba(168,131,57,0.2)]" aria-hidden="true" />

          {sections.map(({ intent, items }, index) => (
            <article key={intent.slug} id={intent.slug} className="relative scroll-mt-28">
              <div
                className="absolute left-[-41px] top-px flex h-[15px] w-[15px] items-center justify-center sm:left-[-57px]"
                aria-hidden="true"
              >
                <span className="absolute inset-0 rounded-full bg-gilded/35 blur-[3px]" />
                <span className="relative h-2 w-2 rounded-full bg-[#b08a49] shadow-[0_0_6px_rgba(168,131,57,0.52)]" />
              </div>

              <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-gilded">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="h-px w-7 bg-gilded/45" aria-hidden="true" />
                    <span className="font-sans text-[10px] text-sepia">{items.length} 个可用</span>
                  </div>
                  <h2 className="mt-1.5 font-serif text-2xl leading-tight text-ink-brown sm:text-3xl">
                    {intent.title}
                  </h2>
                  <p className="mt-1.5 max-w-3xl font-sans text-xs leading-5 text-leather">
                    {intent.description}
                  </p>
                </div>
              </header>

              <ChapterRule className="mt-3" />

              <SkillCardGrid items={items} currentUserId={currentUserId} />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function SkillCardGrid({ items, currentUserId }: { items: PostCardData[]; currentUserId: number | null }) {
  if (items.length === 0) {
    return (
      <div className="mt-5 border-l border-dashed border-gilded/45 bg-vellum/45 px-5 py-6">
        <p className="font-serif italic text-sm text-sepia">这一类工作还缺少合适的 Skill。</p>
        <Link href="/publish" className="mt-2 inline-flex font-serif text-sm text-ink-brown hover:text-wax-red">
          分享一个对应 Skill →
        </Link>
      </div>
    );
  }

  const visible = items.slice(0, 6);
  const remaining = items.slice(6);

  return (
    <div className="mt-4">
      <ol className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((post) => (
          <li key={post.id}>
            <PostCard post={post} currentUserId={currentUserId} variant="compact" />
          </li>
        ))}
      </ol>

      {remaining.length > 0 && (
        <details className="group mt-2.5 border-t border-paper-edge pt-2.5">
          <summary className="cursor-pointer list-none font-serif italic text-sm text-sepia transition-colors hover:text-wax-red">
            <span className="group-open:hidden">展开另外 {remaining.length} 个 Skill ↓</span>
            <span className="hidden group-open:inline">收起这一组 ↑</span>
          </summary>
          <ol className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {remaining.map((post) => (
              <li key={post.id}>
                <PostCard post={post} currentUserId={currentUserId} variant="compact" />
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
