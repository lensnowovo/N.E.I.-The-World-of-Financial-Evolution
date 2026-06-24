import Link from 'next/link';

/**
 * 首页 MCP 区（轻量版）。
 *
 * 原来是大块深色区 + 4 步流程，对已经知道 MCP 的用户是噪音、占首页空间。
 * 现在缩成紧凑一行卡片：MCP 标签 + 一句话价值 + 客户端标签 + 配置入口。
 * 详细教程仍在 /connect 和 /mcp 页。
 */
export function HomeMcpFeature() {
  return (
    <section className="my-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 rounded-md border border-gilded/40 bg-gilded/5 px-5 py-3.5">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="shrink-0 font-display tracking-display text-[10px] text-gilded uppercase">
          MCP
        </span>
        <p className="font-serif text-sm text-ink-brown truncate">
          把收藏的 Skill 接进 Claude / Cursor / Windsurf，在 AI 助手里直接调用
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex gap-1.5">
          {['Claude', 'Cursor', 'Windsurf'].map((c) => (
            <span
              key={c}
              className="border border-paper-edge px-2 py-0.5 font-mono text-[10px] text-sepia rounded-full"
            >
              {c}
            </span>
          ))}
        </div>
        <Link
          href="/connect"
          className="inline-flex items-center h-8 px-3 bg-ink-brown text-vellum hover:bg-wax-red font-serif text-xs rounded-sm transition-colors"
        >
          配置 MCP →
        </Link>
      </div>
    </section>
  );
}
