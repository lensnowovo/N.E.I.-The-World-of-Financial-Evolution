import Link from 'next/link';
import type { TaskBundle } from '@/lib/bundles';
import type { PostCardData } from '@/lib/types';
import { PostCard } from '@/components/PostCard';

export type BundleStepCards = {
  stepTitle: string;
  items: PostCardData[];
};

export function HomeBundleTimeline({
  bundle,
  stepCards,
  currentUserId,
  framed = true,
  showHeader = true,
}: {
  bundle: TaskBundle;
  stepCards: BundleStepCards[];
  currentUserId: number | null;
  framed?: boolean;
  showHeader?: boolean;
}) {
  return (
    <section
      id="bundle"
      className={framed ? 'scroll-mt-24 py-10 sm:py-12 border-b border-paper-edge' : 'scroll-mt-24'}
    >
      {showHeader && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-1">
              Bundle Workflow
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl text-ink-brown">
              {bundle.title}
            </h2>
            <p className="mt-2 max-w-2xl font-sans text-sm leading-6 text-leather">
              {bundle.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="border border-paper-edge bg-vellum px-2.5 py-1 font-sans text-[11px] text-sepia">
              {bundle.steps.length} 个步骤
            </span>
            <span className="border border-paper-edge bg-vellum px-2.5 py-1 font-sans text-[11px] text-sepia">
              {bundle.skillCountLabel}
            </span>
            <span className="border border-moss/40 bg-moss/5 px-2.5 py-1 font-sans text-[11px] text-moss">
              {bundle.mcpLabel}
            </span>
          </div>
        </div>
      )}

      <div className={showHeader ? 'mt-8 space-y-7' : 'space-y-7'}>
        {bundle.steps.map((step, index) => {
          const cards = stepCards.find((row) => row.stepTitle === step.title)?.items || [];
          return (
            <div key={step.title} className="relative grid gap-4 pl-8 md:grid-cols-[220px_1fr] md:gap-6">
              {index < bundle.steps.length - 1 && (
                <div className="absolute left-2 top-1 bottom-[-1.75rem] w-px bg-paper-edge" aria-hidden="true" />
              )}
              <div className="absolute left-0 top-1.5 h-4 w-4 rounded-full border border-ink-brown bg-vellum shadow-[0_0_0_4px_rgba(246,239,224,0.95)]" aria-hidden="true" />

              <div>
                <p className="font-mono text-[10px] text-sepia mb-1">
                  STEP {String(index + 1).padStart(2, '0')}
                </p>
                <h3 className="font-serif text-xl text-ink-brown">{step.title}</h3>
                <p className="mt-1.5 font-sans text-xs leading-5 text-leather">
                  {step.description}
                </p>
              </div>

              {cards.length > 0 ? (
                <ol className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  {cards.map((post) => (
                    <li key={post.id}>
                      <PostCard post={post} currentUserId={currentUserId} variant="compact" />
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="rounded-md border border-dashed border-paper-edge bg-vellum/50 px-4 py-5">
                  <p className="font-serif italic text-sm text-sepia">
                    这一阶段还在等待更多 Skill 贡献。
                  </p>
                  <Link
                    href="/publish"
                    className="mt-2 inline-flex font-serif text-sm text-ink-brown hover:text-wax-red"
                  >
                    分享一个对应 Skill →
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
