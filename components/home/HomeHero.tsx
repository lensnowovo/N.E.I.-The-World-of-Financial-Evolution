import Link from 'next/link';

export function HomeHero({
  totalSkills,
  workflowCount,
}: {
  totalSkills: number;
  workflowCount: number;
}) {
  return (
    <section className="pb-8 sm:pb-10 border-b border-paper-edge">
      <p className="font-display tracking-display text-[10px] sm:text-[11px] text-wax-red uppercase mb-3">
        PEVC AI Workflow Hub
      </p>

      <h1 className="max-w-4xl font-serif text-4xl sm:text-5xl leading-tight text-ink-brown">
        N.E.I.：一级市场投资人的 AI Skill Hub
      </h1>

      <p className="max-w-4xl mt-4 font-sans text-sm sm:text-base leading-7 text-leather">
        收集、收藏、调用 PE/VC/FA 工作流。从 BP 初筛、行业研究、商业尽调、财务分析，
        到 IC Memo、投后管理和 LP 汇报，把重复性投研工作变成可复用、可执行、可协作的 AI Skill。
      </p>

      <form action="/" method="get" className="mt-6 flex w-full max-w-2xl">
        <label htmlFor="home-skill-search" className="sr-only">
          搜索 Skill
        </label>
        <input
          id="home-skill-search"
          name="q"
          type="search"
          placeholder="搜索场景、行业、工作流或作者…"
          className="min-w-0 flex-1 h-11 bg-vellum border border-paper-edge border-r-0 px-4 font-serif italic text-sm text-ink-brown placeholder:text-sepia/70 focus:border-ink-brown"
        />
        <button
          type="submit"
          className="shrink-0 h-11 px-5 bg-ink-brown text-vellum hover:bg-wax-red font-serif text-sm transition-colors"
        >
          搜索 Skill
        </button>
      </form>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <Link
          href="#skill-library"
          className="inline-flex items-center justify-center h-10 px-5 bg-ink-brown text-vellum hover:bg-wax-red font-serif text-sm rounded-sm transition-colors"
        >
          开始找 Skill
        </Link>
        <Link
          href="/connect"
          className="inline-flex items-center justify-center h-10 px-5 border border-ink-brown text-ink-brown hover:bg-ink-brown hover:text-vellum font-serif text-sm rounded-sm transition-colors"
        >
          配置 MCP
        </Link>
        <Link
          href="/publish"
          className="inline-flex items-center justify-center h-10 px-3 font-serif italic text-sm text-leather hover:text-wax-red transition-colors"
        >
          分享我的工作流 →
        </Link>
      </div>

      <dl className="mt-7 pt-5 border-t border-paper-edge flex flex-wrap gap-x-8 gap-y-3">
        <Stat value={String(totalSkills)} label="个公开 Skill" />
        <Stat value={String(workflowCount)} label="个完整工作流" />
        <Stat value="MCP" label="已支持收藏库调用" />
        <Stat value="3" label="类 AI 客户端可接入" />
      </dl>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="font-sans text-xs text-sepia order-2">{label}</dt>
      <dd className="font-serif text-xl text-ink-brown num-osf order-1">{value}</dd>
    </div>
  );
}
