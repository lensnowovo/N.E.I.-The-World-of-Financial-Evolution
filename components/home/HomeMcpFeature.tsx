import Link from 'next/link';

const STEPS = [
  ['01', '收藏 Skill', '把常用的投研方法加入自己的 Skill Library。'],
  ['02', '生成 MCP Token', '在连接配置页生成只属于你的访问凭证。'],
  ['03', '连接 AI 客户端', '按指南配置 Claude、Cursor 或 Windsurf。'],
  ['04', '直接调用', '在对话里让 AI 自动找到并使用收藏的工作流。'],
] as const;

export function HomeMcpFeature() {
  return (
    <section className="my-10 sm:my-12 border-y border-gilded/50 bg-ink-brown px-5 py-7 sm:px-8 sm:py-9 text-vellum">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-6 lg:items-end">
        <div>
          <p className="font-display tracking-display text-[10px] text-gilded uppercase mb-2">
            N.E.I. MCP Server
          </p>
          <h2 className="font-serif text-3xl text-vellum">把 N.E.I. 接进你的 AI 助手</h2>
          <p className="mt-3 max-w-3xl font-sans text-sm leading-6 text-paper-edge">
            收藏 Skill 后，你可以通过 N.E.I. MCP Server 在 Claude、Cursor、Windsurf 等客户端中直接调用
            自己的 PEVC 工作流。不用反复复制 Prompt，让 AI 助手自动找到你收藏的投资分析方法。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['Claude', 'Cursor', 'Windsurf'].map((client) => (
            <span key={client} className="border border-gilded/50 px-2.5 py-1 font-mono text-[10px] text-vellum rounded-full">
              {client}
            </span>
          ))}
        </div>
      </div>

      <ol className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-vellum/20">
        {STEPS.map(([number, title, description], index) => (
          <li
            key={number}
            className={`py-4 lg:px-4 ${index > 0 ? 'border-t sm:border-t-0 lg:border-l border-vellum/20' : ''} ${index % 2 === 1 ? 'sm:border-l border-vellum/20' : ''}`}
          >
            <span className="font-mono text-[10px] text-gilded">{number}</span>
            <h3 className="mt-1 font-serif text-lg text-vellum">{title}</h3>
            <p className="mt-1 font-sans text-xs leading-5 text-paper-edge">{description}</p>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-wrap gap-2.5">
        <Link
          href="/connect"
          className="inline-flex items-center justify-center h-10 px-5 bg-vellum text-ink-brown hover:bg-gilded font-serif text-sm rounded-sm transition-colors"
        >
          配置 MCP Server
        </Link>
        <Link
          href="/mcp"
          className="inline-flex items-center justify-center h-10 px-5 border border-vellum/40 text-vellum hover:border-vellum font-serif text-sm rounded-sm transition-colors"
        >
          查看一键配置教程
        </Link>
      </div>
    </section>
  );
}
