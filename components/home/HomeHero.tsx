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
      <p className="max-w-4xl font-serif text-3xl sm:text-5xl leading-tight text-ink-brown mb-2">
        N.E.I. · New Era Investors
      </p>

      <h1 className="max-w-4xl font-serif text-4xl sm:text-5xl leading-tight text-ink-brown">
        一级市场投资人的 AI Skills Hub
      </h1>

      <p className="max-w-4xl mt-4 font-sans text-sm sm:text-base leading-7 text-leather">
        面向 PE、VC、FA、产业投资、政府引导基金与投后管理场景，
        整理 BP 初筛、行业研究、商业尽调、财务分析、IC Memo、投后管理和 LP 汇报方法。
        Skill 与 Workflow 可检索、可收藏，并可通过 MCP 调用。
      </p>

      <form
        action="/#skill-library"
        method="get"
        className="mt-7 flex w-full max-w-4xl rounded-md border-2 border-ink-brown bg-vellum shadow-card focus-within:ring-2 focus-within:ring-gilded/35"
      >
        <label htmlFor="home-skill-search" className="sr-only">
          搜索 Skill
        </label>
        <span
          className="hidden w-14 shrink-0 items-center justify-center border-r border-paper-edge text-sepia sm:flex"
          aria-hidden="true"
        >
          <SearchIcon />
        </span>
        <input
          id="home-skill-search"
          name="q"
          type="search"
          placeholder="搜索 BP 初筛、半导体行研、IC Memo、专家访谈、LP 季报..."
          className="min-w-0 flex-1 h-16 bg-transparent px-4 font-serif italic text-lg text-ink-brown placeholder:text-sepia/65 focus:outline-none sm:h-[72px] sm:px-5 sm:text-xl"
        />
        <button
          type="submit"
          className="shrink-0 border-l border-ink-brown bg-ink-brown px-5 font-serif text-base text-vellum transition-colors hover:bg-wax-red sm:px-8"
        >
          搜索 Skill
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2 font-sans text-xs">
        <span className="font-display tracking-display text-[10px] text-sepia uppercase">Hot</span>
        {HOT_TERMS.map((term) => (
          <Link
            key={term}
            href={`/?q=${encodeURIComponent(term)}#skill-library`}
            className="border border-paper-edge bg-vellum px-2 py-1 text-sepia hover:border-ink-brown hover:text-ink-brown transition-colors"
          >
            {term}
          </Link>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <Link
          href="#skill-library"
          className="inline-flex items-center justify-center h-10 px-5 bg-ink-brown text-vellum hover:bg-wax-red font-serif text-sm rounded-sm transition-colors"
        >
          按任务浏览
        </Link>
        <Link
          href="/connect"
          className="inline-flex items-center justify-center h-10 px-5 border border-ink-brown text-ink-brown hover:bg-ink-brown hover:text-vellum font-serif text-sm rounded-sm transition-colors"
        >
          连接 MCP
        </Link>
        <Link
          href="/publish"
          className="inline-flex items-center justify-center h-10 px-3 font-serif italic text-sm text-leather hover:text-wax-red transition-colors"
        >
          提交工作流 →
        </Link>
      </div>

      <dl className="mt-7 pt-5 border-t border-paper-edge flex flex-wrap gap-x-8 gap-y-3">
        <Stat value={String(totalSkills)} label="个公开 Skill" />
        <Stat value={String(workflowCount)} label="个 Workflow" />
        <Stat value="MCP" label="全库搜索 + 收藏沉淀" />
        <Stat value="3" label="类客户端连接方式" />
      </dl>
    </section>
  );
}

const HOT_TERMS = ['BP 初筛', '半导体行研', 'IC Memo', '专家访谈', 'LP 季报', '投后月报'];

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="font-sans text-xs text-sepia order-2">{label}</dt>
      <dd className="font-serif text-xl text-ink-brown num-osf order-1">{value}</dd>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5 L13.5 13.5" strokeLinecap="round" />
    </svg>
  );
}
