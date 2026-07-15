import type { Metadata } from 'next';
import Link from 'next/link';
import { mcpLibraryCategories, mcpLibraryItems } from '@/lib/mcp-library';
import { McpLibraryExplorer } from '@/components/mcp/McpLibraryExplorer';

export const metadata: Metadata = {
  title: '投研外部信息工具库 | N.E.I.',
  description: '面向 PEVC 投研、尽调、硬科技验证和外部信息获取的 MCP / API 连接器目录。',
};

export default function McpLibraryPage() {
  const internal = mcpLibraryItems.find((item) => item.internal);
  const external = mcpLibraryItems.filter((item) => !item.internal);
  const recommended = external.filter((item) => item.status === '推荐试用').length;

  return (
    <main className="mx-auto max-w-page px-4 pb-20 pt-8 sm:px-6">
      <section className="relative overflow-hidden border-b border-paper-edge pb-7">
        <div className="mcp-library-radar" aria-hidden="true" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_330px] lg:items-end">
          <div>
            <p className="font-display text-[10px] uppercase tracking-[0.22em] text-gilded">MCP / API Directory</p>
            <h1 className="mt-3 max-w-4xl font-serif text-4xl leading-[1.08] text-ink-brown sm:text-5xl">投研外部信息工具库</h1>
            <p className="mt-4 max-w-2xl font-sans text-sm leading-7 text-leather">收录论文、临床试验、网页、公司信息、开源生态和工程计算相关的 MCP 与 API，并标注接入成本和适用范围。</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {mcpLibraryCategories.map((category, index) => (
                <span key={category.key} className="inline-flex items-center gap-2 border-b border-paper-edge px-1 py-1 font-serif text-xs text-sepia">
                  <span className="font-mono text-[9px] text-gilded">{String(index + 1).padStart(2, '0')}</span>{category.label}
                </span>
              ))}
            </div>
          </div>
          <div className="border-l border-gilded/45 pl-5">
            <p className="font-display text-[9px] uppercase tracking-[0.18em] text-sepia">Directory brief</p>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <HeroStat label="外部源" value={String(external.length)} />
              <HeroStat label="分类" value={String(mcpLibraryCategories.length)} />
              <HeroStat label="推荐" value={String(recommended)} />
            </div>
            <p className="mt-4 font-sans text-xs leading-5 text-leather">先查公开信息，敏感材料先脱敏。陌生连接器不要直接接入带有本地文件、邮箱或网盘权限的工作环境。</p>
          </div>
        </div>
      </section>

      {internal && (
        <section className="mt-6 grid overflow-hidden border border-gilded/45 bg-gilded/7 lg:grid-cols-[170px_1fr_auto] lg:items-center">
          <div className="bg-ink-brown px-5 py-5 text-vellum lg:h-full">
            <p className="font-display text-[9px] uppercase tracking-[0.18em] text-gilded">Core bridge</p>
            <p className="mt-2 font-serif text-lg">N.E.I. 自有连接</p>
          </div>
          <div className="px-5 py-4">
            <h2 className="font-serif text-xl text-ink-brown">{internal.name}</h2>
            <p className="mt-1 font-sans text-xs leading-6 text-leather">{internal.highlight} 它负责分发方法，不属于下面的外部数据源。</p>
          </div>
          <div className="flex flex-wrap gap-2 px-5 pb-5 lg:pb-0">
            <Link href="/connect" className="inline-flex h-10 items-center bg-ink-brown px-4 font-serif text-sm text-vellum transition-colors hover:bg-wax-red">连接 N.E.I. MCP →</Link>
            <Link href="/security" className="inline-flex h-10 items-center border border-paper-edge bg-vellum/65 px-4 font-serif text-sm text-leather hover:border-sepia">查看安全边界</Link>
          </div>
        </section>
      )}

      <McpLibraryExplorer />
    </main>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-serif text-3xl text-ink-brown">{value}</p>
      <p className="mt-1 font-display text-[9px] uppercase tracking-display text-sepia">{label}</p>
    </div>
  );
}
