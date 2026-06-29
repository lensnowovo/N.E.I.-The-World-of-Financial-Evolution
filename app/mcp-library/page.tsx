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
    <main className="mx-auto max-w-page px-4 pb-20 pt-10 sm:px-6">
      <section className="overflow-hidden rounded-2xl border border-ink-brown/20 bg-ink-brown text-vellum shadow-card">
        <div className="grid gap-8 border-b border-vellum/10 px-5 py-7 sm:px-8 lg:grid-cols-[1.25fr_0.75fr] lg:px-10 lg:py-10">
          <div>
            <p className="font-display text-[10px] uppercase tracking-display text-gilded">
              External Intelligence Connectors
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-3xl leading-tight text-vellum sm:text-5xl">
              MCP / API 库
            </h1>
            <p className="mt-4 max-w-2xl font-sans text-sm leading-7 text-vellum/75">
              这里收录适合投研、尽调和硬科技验证的外部信息连接器。它们不是 N.E.I. Skill，
              更像 Agent 的“数据接口清单”：查公开资料、读论文、看开源生态、做工程验算、抓网页。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/posts/${sourcePostId}`}
                className="inline-flex h-10 items-center rounded-sm bg-vellum px-4 font-serif text-sm text-ink-brown transition-colors hover:bg-gilded hover:text-vellum"
              >
                查看完整工具箱文章 →
              </Link>
              <Link
                href="/security"
                className="inline-flex h-10 items-center rounded-sm border border-vellum/25 px-4 font-serif text-sm text-vellum/85 transition-colors hover:border-gilded hover:text-gilded"
              >
                MCP 安全边界
              </Link>
            </div>
          </div>

          <div className="grid gap-3 rounded-xl border border-vellum/10 bg-vellum/[0.04] p-4 font-sans">
            <Stat label="收录连接器" value={mcpLibraryItems.length.toString()} />
            <Stat label="MCP 优先" value={mcpCount.toString()} />
            <Stat label="API / 自建候选" value={apiCount.toString()} />
            <div className="mt-2 rounded-lg border border-gilded/30 bg-gilded/10 p-3 text-xs leading-6 text-vellum/78">
              建议先把这些工具当作“外部公开信息入口”。任何涉及项目材料、BP、财务模型、访谈纪要的内容，
              都应先脱敏，再交给外部 MCP / API。
            </div>
          </div>
        </div>

        <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:px-10">
          {mcpLibraryCategories.map((category) => (
            <a
              key={category.key}
              href={`#${category.key}`}
              className="group rounded-xl border border-vellum/10 bg-vellum/[0.035] p-4 transition-colors hover:border-gilded/50 hover:bg-vellum/[0.07]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-[10px] uppercase tracking-display text-gilded">
                  {category.short}
                </span>
                <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${category.tone}`}>
                  {getMcpLibraryItemsByCategory(category.key).length}
                </span>
              </div>
              <p className="mt-2 font-serif text-base text-vellum group-hover:text-gilded">
                {category.label}
              </p>
              <p className="mt-1 font-sans text-xs leading-5 text-vellum/58">
                {category.description}
              </p>
            </a>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-paper-edge bg-vellum p-5 shadow-card sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-[10px] uppercase tracking-display text-sepia">
              Recommended First
            </p>
            <h2 className="mt-1 font-serif text-2xl text-ink-brown">
              先试这几个
            </h2>
          </div>
          <p className="max-w-xl font-sans text-xs leading-6 text-sepia">
            这些连接器更适合作为第一批试点：有明确 PEVC 场景、信息价值高、接入成本相对可控。
          </p>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {featuredItems.map((item) => (
            <FeaturedConnector key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="mt-8 space-y-8">
        {mcpLibraryCategories.map((category) => {
          const items = getMcpLibraryItemsByCategory(category.key);
          if (items.length === 0) return null;

          return (
            <div
              key={category.key}
              id={category.key}
              className="scroll-mt-24 overflow-hidden rounded-2xl border border-paper-edge bg-parchment shadow-card"
            >
              <div className="border-b border-paper-edge bg-ink-brown px-5 py-5 text-vellum sm:px-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="font-display text-[10px] uppercase tracking-display text-gilded">
                      {category.short}
                    </p>
                    <h2 className="mt-1 font-serif text-2xl text-vellum">
                      {category.label}
                    </h2>
                    <p className="mt-2 max-w-2xl font-sans text-xs leading-6 text-vellum/68">
                      {category.description}
                    </p>
                  </div>
                  <span className={`w-fit rounded-full border px-3 py-1 font-mono text-xs ${category.tone}`}>
                    {items.length} connectors
                  </span>
                </div>
              </div>

              <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
                {items.map((item) => (
                  <ConnectorModule key={item.id} item={item} />
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-vellum/10 pb-2">
      <span className="text-xs text-vellum/60">{label}</span>
      <span className="font-mono text-2xl text-gilded">{value}</span>
    </div>
  );
}

function FeaturedConnector({ item }: { item: McpLibraryItem }) {
  return (
    <article className="relative overflow-hidden rounded-xl border border-ink-brown/12 bg-ink-brown p-4 text-vellum">
      <div className="absolute inset-x-0 top-0 h-1 bg-gilded" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gilded">
            {item.kind}
          </p>
          <h3 className="mt-1 font-serif text-xl text-vellum">{item.name}</h3>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <p className="mt-3 font-sans text-sm leading-6 text-vellum/72">
        {item.highlight}
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {item.bestFor.slice(0, 4).map((tag) => (
          <span key={tag} className="rounded-full border border-vellum/15 px-2 py-0.5 font-sans text-[11px] text-vellum/70">
            {tag}
          </span>
        ))}
      </div>
      <ConnectorActions item={item} dark />
    </article>
  );
}

function ConnectorModule({ item }: { item: McpLibraryItem }) {
  return (
    <article className="group relative overflow-hidden rounded-xl border border-paper-edge bg-vellum transition-colors hover:border-sepia">
      <div className="absolute inset-y-0 left-0 w-1 bg-ink-brown group-hover:bg-wax-red" />
      <div className="border-b border-paper-edge bg-parchment/55 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-sepia">
                {item.kind}
              </span>
              <StatusBadge status={item.status} />
            </div>
            <h3 className="mt-1 font-serif text-xl text-ink-brown">
              {item.name}
            </h3>
          </div>
          <span className="rounded-sm border border-paper-edge bg-vellum px-2 py-1 font-mono text-[10px] text-sepia">
            {item.maturity}
          </span>
        </div>
        <p className="mt-3 font-sans text-sm leading-6 text-leather">
          {item.highlight}
        </p>
      </div>

      <div className="space-y-4 px-5 py-4">
        <ModuleRow label="覆盖信息" value={item.coverage} />
        <ModuleList label="PEVC 用法" items={item.pevcUseCases} />

        <div className="grid gap-2 sm:grid-cols-3">
          <MiniSpec label="授权" value={item.auth} />
          <MiniSpec label="费用" value={item.pricing} />
          <MiniSpec label="成熟度" value={item.maturity} />
        </div>

        <div>
          <p className="font-display text-[10px] uppercase tracking-display text-sepia">
            Best For
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.bestFor.map((tag) => (
              <span key={tag} className="rounded-full border border-paper-edge bg-parchment px-2 py-0.5 font-sans text-[11px] text-leather">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gilded/30 bg-gilded/10 p-3">
          <p className="font-display text-[10px] uppercase tracking-display text-gilded">
            Safety Note
          </p>
          <p className="mt-1 font-sans text-xs leading-5 text-leather">
            {item.safetyNote}
          </p>
        </div>

        <ConnectorActions item={item} />
      </div>
    </article>
  );
}

function ModuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-[10px] uppercase tracking-display text-sepia">
        {label}
      </p>
      <p className="mt-1 font-sans text-sm leading-6 text-leather">{value}</p>
    </div>
  );
}

function ModuleList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="font-display text-[10px] uppercase tracking-display text-sepia">
        {label}
      </p>
      <ul className="mt-2 grid gap-1.5 font-sans text-xs leading-5 text-leather">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gilded" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniSpec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-paper-edge bg-parchment px-3 py-2">
      <p className="font-sans text-[10px] text-sepia">{label}</p>
      <p className="mt-0.5 font-serif text-sm text-ink-brown">{value}</p>
    </div>
  );
}

function ConnectorActions({ item, dark = false }: { item: McpLibraryItem; dark?: boolean }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className={
            dark
              ? 'inline-flex h-8 items-center rounded-sm bg-vellum px-3 font-serif text-xs text-ink-brown transition-colors hover:bg-gilded hover:text-vellum'
              : 'inline-flex h-8 items-center rounded-sm bg-ink-brown px-3 font-serif text-xs text-vellum transition-colors hover:bg-wax-red'
          }
        >
          官方 / 项目链接 ↗
        </a>
      )}
      {item.sourcePostId && (
        <Link
          href={`/posts/${item.sourcePostId}`}
          className={
            dark
              ? 'inline-flex h-8 items-center rounded-sm border border-vellum/20 px-3 font-serif text-xs text-vellum/75 transition-colors hover:border-gilded hover:text-gilded'
              : 'inline-flex h-8 items-center rounded-sm border border-paper-edge bg-vellum px-3 font-serif text-xs text-leather transition-colors hover:border-sepia hover:text-ink-brown'
          }
        >
          查看 N.E.I. 说明
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
