import Link from 'next/link';

/**
 * 首页 MCP 入口。
 *
 * 连接状态采用真实调用口径：只有有效 Token 成功打到 MCP tool 并写入 McpCallLog，
 * 才显示已调通；仅生成 Token 不显示绿灯。
 */
export type HomeMcpConnectionStatus = {
  signedIn: boolean;
  hasMcpToken: boolean;
  lastMcpCallAt: Date | null;
};

export function HomeMcpFeature({ status }: { status: HomeMcpConnectionStatus }) {
  const connected = Boolean(status.lastMcpCallAt);
  if (connected) return null;

  const state = status.hasMcpToken ? 'pending' : 'empty';
  const copy =
    state === 'pending'
        ? {
            eyebrow: 'MCP 等待调通',
            title: 'Token 已生成，还差最后一次客户端验证',
            detail:
              '把配置粘贴到 Claude Code、Codex、Workbuddy 或其它 Agent 客户端后，调用 search_skills 搜全库。成功调用后这里才会变成绿灯。',
            href: '/connect',
            cta: '继续连接 MCP',
          }
        : {
            eyebrow: status.signedIn ? 'MCP 未连接' : '登录后连接 MCP',
            title: '把 N.E.I. Skill 全库接进 Agent 客户端',
            detail:
              '生成 Token → 配置客户端 → 搜索公开 Skill 全库；遇到好用的再收藏沉淀。N.E.I. 只分发 Skill / Workflow，不读取本地文件。',
            href: '/connect',
            cta: status.signedIn ? '3 分钟连接 MCP' : '登录并连接 MCP',
          };

  return (
    <section className="my-6 flex flex-col gap-4 rounded-lg border border-gilded/40 bg-ink-brown px-5 py-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className={
            state === 'pending'
              ? 'mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-gilded shadow-[0_0_0_4px_rgba(168,131,57,0.25)]'
              : 'mt-1 h-2.5 w-2.5 shrink-0 rounded-full border border-gilded bg-vellum'
          }
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="font-display text-[10px] uppercase tracking-display text-gilded">
            {copy.eyebrow}
          </p>
          <h2 className="mt-1 font-serif text-lg text-vellum">
            {copy.title}
          </h2>
          <p className="mt-1 max-w-2xl font-sans text-xs leading-relaxed text-vellum/75">
            {copy.detail}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <div className="hidden gap-1.5 sm:flex">
          {['Claude Code', 'Codex', 'Workbuddy'].map((client) => (
            <span
              key={client}
              className="rounded-full border border-gilded/35 bg-vellum/5 px-2 py-0.5 font-mono text-[10px] text-vellum/75"
            >
              {client}
            </span>
          ))}
        </div>
        <Link
          href={copy.href}
          className="inline-flex h-9 items-center rounded-sm bg-vellum px-4 font-serif text-sm text-ink-brown transition-colors hover:bg-gilded hover:text-vellum"
        >
          {copy.cta} →
        </Link>
        <Link
          href="/mcp-library"
          className="inline-flex h-9 items-center rounded-sm border border-vellum/20 px-4 font-serif text-sm text-vellum/80 transition-colors hover:border-gilded hover:text-gilded"
        >
          浏览 MCP 库
        </Link>
      </div>
    </section>
  );
}
