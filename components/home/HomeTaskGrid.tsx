import Link from 'next/link';
import { taskBundles } from '@/lib/bundles';

export function HomeTaskGrid({ activeSlug }: { activeSlug?: string }) {
  return (
    <section className="py-10 sm:py-12 border-b border-paper-edge">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-1">
            Task Bundles
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl text-ink-brown">
            你今天要完成什么投资工作？
          </h2>
        </div>
        <p className="font-sans text-xs sm:text-sm text-sepia">
          从具体任务进入，按流程调用对应的 Skill、Workflow 和 MCP 方法。
        </p>
      </div>

      <ol className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {taskBundles.map((bundle, index) => {
          const active = activeSlug === bundle.slug;
          return (
            <li key={bundle.slug}>
              <Link
                href={`/?bundle=${bundle.slug}#bundle`}
                className={[
                  'group flex h-full min-h-44 flex-col rounded-md border bg-vellum p-4 transition-all',
                  active
                    ? 'border-ink-brown shadow-card'
                    : 'border-paper-edge hover:border-sepia hover:shadow-card',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-sepia">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="font-sans text-[10px] text-sepia">
                    {bundle.steps.length} 步骤
                  </span>
                </div>
                <h3 className="mt-2 font-serif text-xl text-ink-brown group-hover:text-wax-red transition-colors">
                  {bundle.shortTitle}
                </h3>
                <p className="mt-1.5 font-sans text-xs leading-5 text-leather">
                  {bundle.description}
                </p>
                <p className="mt-3 font-sans text-[11px] leading-5 text-sepia">
                  输出：{bundle.output}
                </p>
                <div className="mt-auto pt-4 flex flex-wrap items-center gap-1.5">
                  <span className="border border-paper-edge bg-parchment px-1.5 py-0.5 font-sans text-[10px] text-sepia">
                    {bundle.skillCountLabel}
                  </span>
                  <span className="border border-moss/40 bg-moss/5 px-1.5 py-0.5 font-sans text-[10px] text-moss">
                    {bundle.mcpLabel}
                  </span>
                </div>
                <span className="mt-3 font-serif italic text-xs text-sepia group-hover:text-ink-brown">
                  进入工作流 →
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
