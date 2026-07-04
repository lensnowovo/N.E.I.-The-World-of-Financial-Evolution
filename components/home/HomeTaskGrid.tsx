import Link from 'next/link';
import { taskBundles } from '@/lib/bundles';

export function HomeTaskGrid() {
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
          从具体任务进入，查看一组可复用的 Skill 与工作流步骤。
        </p>
      </div>

      <ol className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {taskBundles.map((bundle, index) => {
          const isMcpSetup = bundle.slug === 'mcp-setup';
          return (
            <li key={bundle.slug}>
              <Link
                href={isMcpSetup ? '/mcp-library' : `/bundles/${bundle.slug}`}
                className={
                  isMcpSetup
                    ? 'group flex h-full min-h-40 flex-col rounded-md border border-gilded/45 bg-leather p-4 text-vellum shadow-card transition-all hover:-translate-y-0.5 hover:border-gilded hover:bg-ink-brown'
                    : 'group flex h-full min-h-40 flex-col rounded-md border border-paper-edge bg-vellum p-4 transition-all hover:border-sepia hover:shadow-card'
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={isMcpSetup ? 'font-mono text-[10px] text-gilded' : 'font-mono text-[10px] text-sepia'}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className={isMcpSetup ? 'font-sans text-[10px] text-vellum/60' : 'font-sans text-[10px] text-sepia'}>
                    {isMcpSetup ? 'MCP / API 库' : `${bundle.steps.length} 步骤`}
                  </span>
                </div>
                <h3 className={isMcpSetup ? 'mt-2 font-serif text-xl text-vellum transition-colors group-hover:text-gilded' : 'mt-2 font-serif text-xl text-ink-brown group-hover:text-wax-red transition-colors'}>
                  {isMcpSetup ? 'MCP 库' : bundle.shortTitle}
                </h3>
                <p className={isMcpSetup ? 'mt-1.5 font-sans text-xs leading-5 text-vellum/72' : 'mt-1.5 font-sans text-xs leading-5 text-leather'}>
                  {isMcpSetup
                    ? '先浏览适合投研、尽调、论文、开源生态和硬科技验算的外部 MCP / API，再接入你的 Agent 工作流。'
                    : bundle.description}
                </p>
                <div className="mt-auto pt-4 flex flex-wrap items-center gap-1.5">
                  <span className={isMcpSetup ? 'border border-gilded/35 bg-vellum/5 px-1.5 py-0.5 font-sans text-[10px] text-vellum/70' : 'border border-paper-edge bg-parchment px-1.5 py-0.5 font-sans text-[10px] text-sepia'}>
                    {isMcpSetup ? '15 个连接器' : bundle.skillCountLabel}
                  </span>
                  {isMcpSetup && (
                    <span className="border border-vellum/15 bg-vellum/5 px-1.5 py-0.5 font-sans text-[10px] text-vellum/60">
                      BioMCP / Wolfram / GitHub
                    </span>
                  )}
                </div>
                <span className={isMcpSetup ? 'mt-3 font-serif italic text-xs text-gilded' : 'mt-3 font-serif italic text-xs text-sepia group-hover:text-ink-brown'}>
                  {isMcpSetup ? '浏览 MCP 库 →' : '进入工作流 →'}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
