import type { Metadata } from 'next';
import Link from 'next/link';
import {
  getMcpLibraryItemsByCategory,
  mcpLibraryCategories,
  mcpLibraryItems,
  type McpLibraryItem,
} from '@/lib/mcp-library';

export const metadata: Metadata = {
  title: 'MCP / API 库 | N.E.I.',
  description:
    '面向 PEVC 投研、尽调、硬科技验证和外部信息获取的 MCP / API 连接器目录。',
};

const sourcePostId = 145;

export default function McpLibraryPage() {
  const featuredItems = mcpLibraryItems.filter((item) => item.featured);
  const mcpCount = mcpLibraryItems.filter((item) => item.kind.includes('MCP')).length;
  const apiCount = mcpLibraryItems.filter((item) => item.kind.includes('API')).length;

  return (
    <main className="mx-auto max-w-page px-4 pb-20 pt-8 sm:px-6">
      <section className="rounded-xl border border-paper-edge bg-vellum shadow-card">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="font-display text-[10px] uppercase tracking-display text-sepia">
              MCP / API Directory
            </p>
            <h1 className="mt-2 font-serif text-3xl leading-tight text-ink-brown sm:text-4xl">
              外部信息连接器库
            </h1>
            <p className="mt-3 max-w-3xl font-sans text-sm leading-7 text-leather">
              这里放的是适合 PEVC 投研、尽调和硬科技验证的 MCP / API。它们不是 Skill 内容，
              更像 Agent 的外部信息接口：查论文、看开源生态、抓网页、读公告、做工程验算。
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {mcpLibraryCategories.map((category) => (
                <a
                  key={category.key}
                  href={`#${category.key}`}
                  className="inline-flex h-8 items-center rounded-full border border-paper-edge bg-parchment px-3 font-serif text-xs text-leather transition-colors hover:border-sepia hover:text-ink-brown"
                >
                  {category.label}
                  <span className="ml-1.5 font-mono text-[10px] text-sepia">
                    {getMcpLibraryItemsByCategory(category.key).length}
                  </span>
                </a>
              ))}
            </div>
          </div>

          <aside className="rounded-lg border border-paper-edge bg-parchment p-4">
            <div className="grid grid-cols-3 gap-2 border-b border-paper-edge pb-4">
              <MiniStat label="收录" value={mcpLibraryItems.length.toString()} />
              <MiniStat label="MCP" value={mcpCount.toString()} />
              <MiniStat label="API" value={apiCount.toString()} />
            </div>
            <p className="mt-4 font-display text-[10px] uppercase tracking-display text-gilded">
              使用原则
            </p>
            <p className="mt-1 font-sans text-xs leading-6 text-leather">
              先查公开信息，敏感材料先脱敏。陌生 MCP 不要直接接入带有本地文件、邮箱、网盘权限的工作环境。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/security"
                className="font-serif text-xs text-wax-red hover:underline"
              >
                MCP 安全边界 →
              </Link>
              <Link
                href={`/posts/${sourcePostId}`}
                className="font-serif text-xs text-sepia hover:text-ink-brown hover:underline"
              >
                完整工具箱文章 →
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-paper-edge bg-parchment p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-[10px] uppercase tracking-display text-sepia">
              Recommended First
            </p>
            <h2 className="mt-1 font-serif text-2xl text-ink-brown">
              建议先试
            </h2>
          </div>
          <p className="max-w-xl font-sans text-xs leading-6 text-sepia">
            先从信息价值高、场景清晰、接入成本较低的连接器开始。
          </p>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {featuredItems.map((item) => (
            <FeaturedRow key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="mt-6 space-y-6">
        {mcpLibraryCategories.map((category) => {
          const items = getMcpLibraryItemsByCategory(category.key);
          if (items.length === 0) return null;

          return (
            <section
              key={category.key}
              id={category.key}
              className="scroll-mt-24 rounded-xl border border-paper-edge bg-vellum"
            >
              <header className="flex flex-col gap-2 border-b border-paper-edge px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="font-display text-[10px] uppercase tracking-display text-sepia">
                    {category.short}
                  </p>
                  <h2 className="mt-1 font-serif text-xl text-ink-brown">
                    {category.label}
                  </h2>
                  <p className="mt-1 max-w-2xl font-sans text-xs leading-5 text-sepia">
                    {category.description}
                  </p>
                </div>
                <span className="w-fit rounded-full border border-paper-edge bg-parchment px-3 py-1 font-mono text-[11px] text-sepia">
                  {items.length} connectors
                </span>
              </header>

              <div className="divide-y divide-paper-edge">
                {items.map((item) => (
                  <ConnectorRow key={item.id} item={item} />
                ))}
              </div>
            </section>
          );
        })}
      </section>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-sans text-[10px] text-sepia">{label}</p>
      <p className="mt-0.5 font-mono text-xl text-ink-brown">{value}</p>
    </div>
  );
}

function FeaturedRow({ item }: { item: McpLibraryItem }) {
  return (
    <article className="rounded-lg border border-paper-edge bg-vellum p-4 transition-colors hover:border-sepia">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gilded">
            {item.kind}
          </p>
          <h3 className="mt-1 font-serif text-lg text-ink-brown">{item.name}</h3>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <p className="mt-2 font-sans text-xs leading-5 text-leather">
        {item.highlight}
      </p>
      <ConnectorActions item={item} compact />
    </article>
  );
}

function ConnectorRow({ item }: { item: McpLibraryItem }) {
  return (
    <article className="grid gap-4 px-5 py-4 transition-colors hover:bg-parchment/55 lg:grid-cols-[260px_1fr_220px]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-sepia">
            {item.kind}
          </span>
          <StatusBadge status={item.status} />
        </div>
        <h3 className="mt-1 font-serif text-xl text-ink-brown">{item.name}</h3>
        <p className="mt-2 font-sans text-xs leading-5 text-leather">
          {item.highlight}
        </p>
      </div>

      <div className="space-y-3">
        <InfoBlock label="覆盖信息" value={item.coverage} />
        <div>
          <p className="font-display text-[10px] uppercase tracking-display text-sepia">
            PEVC 用法
          </p>
          <ul className="mt-1 grid gap-1 font-sans text-xs leading-5 text-leather sm:grid-cols-2">
            {item.pevcUseCases.slice(0, 4).map((useCase) => (
              <li key={useCase} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gilded" />
                <span>{useCase}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="rounded-md border border-gilded/25 bg-gilded/10 px-3 py-2 font-sans text-xs leading-5 text-leather">
          {item.safetyNote}
        </p>
      </div>

      <div className="flex flex-col justify-between gap-4">
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
          <Spec label="授权" value={item.auth} />
          <Spec label="费用" value={item.pricing} />
          <Spec label="成熟度" value={item.maturity} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {item.bestFor.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-paper-edge bg-parchment px-2 py-0.5 font-sans text-[11px] text-sepia"
            >
              {tag}
            </span>
          ))}
        </div>
        <ConnectorActions item={item} />
      </div>
    </article>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-[10px] uppercase tracking-display text-sepia">
        {label}
      </p>
      <p className="mt-1 font-sans text-xs leading-5 text-leather">{value}</p>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-paper-edge bg-parchment px-3 py-2">
      <p className="font-sans text-[10px] text-sepia">{label}</p>
      <p className="mt-0.5 font-serif text-sm text-ink-brown">{value}</p>
    </div>
  );
}

function ConnectorActions({ item, compact = false }: { item: McpLibraryItem; compact?: boolean }) {
  return (
    <div className={`${compact ? 'mt-3' : ''} flex flex-wrap items-center gap-2`}>
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center rounded-sm bg-ink-brown px-3 font-serif text-xs text-vellum transition-colors hover:bg-wax-red"
        >
          项目链接 ↗
        </a>
      )}
      {item.sourcePostId && (
        <Link
          href={`/posts/${item.sourcePostId}`}
          className="inline-flex h-8 items-center rounded-sm border border-paper-edge bg-vellum px-3 font-serif text-xs text-leather transition-colors hover:border-sepia hover:text-ink-brown"
        >
          N.E.I. 说明
        </Link>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: McpLibraryItem['status'] }) {
  const cls =
    status === '推荐试用'
      ? 'border-moss/35 bg-moss/10 text-moss'
      : status === '适合自建'
        ? 'border-gilded/45 bg-gilded/10 text-gilded'
        : status === '需订阅验证'
          ? 'border-wax-red/30 bg-wax-red/10 text-wax-red'
          : 'border-sepia/30 bg-sepia/10 text-sepia';

  return (
    <span className={`rounded-full border px-2 py-0.5 font-sans text-[11px] ${cls}`}>
      {status}
    </span>
  );
}
