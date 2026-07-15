import Link from 'next/link';
import { SkillAtlas } from '@/components/home/SkillAtlas';

export function HomeHero({
  totalSkills,
  workflowCount,
}: {
  totalSkills: number;
  workflowCount: number;
}) {
  return (
    <SkillAtlas>
    <section className="relative px-5 py-7 sm:px-9 sm:py-10 lg:px-12 lg:py-12">
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

      <form action="/#skill-library" method="get" className="mt-6 flex w-full max-w-2xl">
        <label htmlFor="home-skill-search" className="sr-only">
          搜索 Skill
        </label>
        <input
          id="home-skill-search"
          name="q"
          type="search"
          placeholder="搜索 BP 初筛、半导体行研、IC Memo、专家访谈、LP 季报..."
          className="min-w-0 flex-1 h-11 bg-vellum border border-paper-edge border-r-0 px-4 font-serif italic text-sm text-ink-brown placeholder:text-sepia/70 focus:border-ink-brown"
        />
        <button
          type="submit"
          className="shrink-0 h-11 px-5 bg-ink-brown text-vellum hover:bg-wax-red font-serif text-sm transition-colors"
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
    </SkillAtlas>
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
