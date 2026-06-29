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
  const state = connected ? 'connected' : status.hasMcpToken ? 'pending' : 'empty';
  const copy =
    state === 'connected'
      ? {
          eyebrow: 'MCP 已调通',
          title: `最近调用 ${formatDateTime(status.lastMcpCallAt!)}`,
          detail:
            '你的 Agent 客户端已经用有效 Token 打到 N.E.I. MCP。可继续收藏 Skill，并在客户端调用 list_my_skills。',
          href: '/dashboard',
          cta: '查看调用记录',
          tone: 'connected' as const,
        }
      : state === 'pending'
        ? {
            eyebrow: 'MCP 等待调通',
            title: 'Token 已生成，还差最后一次客户端验证',
            detail:
              '把配置粘贴到 Claude Code、Codex、Workbuddy 或其它 Agent 客户端后，调用 list_my_skills。成功调用后这里才会变成绿灯。',
            href: '/connect',
            cta: '继续连接 MCP',
            tone: 'pending' as const,
          }
        : {
            eyebrow: status.signedIn ? 'MCP 未连接' : '登录后连接 MCP',
            title: '把你的收藏库接进 Agent 客户端',
            detail:
              '收藏 Skill → 生成 Token → 配置客户端 → 调用 list_my_skills。N.E.I. 只分发 Skill / Workflow，不读取本地文件。',
            href: '/connect',
            cta: status.signedIn ? '3 分钟连接 MCP' : '登录并连接 MCP',
            tone: 'empty' as const,
          };

  return (
    <section
      className={
        copy.tone === 'connected'
          ? 'my-6 flex flex-col gap-4 rounded-lg border border-moss/30 bg-moss/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between'
          : 'my-6 flex flex-col gap-4 rounded-lg border border-gilded/50 bg-gradient-to-br from-gilded/12 via-vellum to-parchment px-5 py-4 shadow-card sm:flex-row sm:items-center sm:justify-between'
      }
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className={
            connected
              ? 'mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-moss shadow-[0_0_0_4px_rgba(79,91,59,0.12)]'
              : state === 'pending'
                ? 'mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-gilded shadow-[0_0_0_4px_rgba(168,131,57,0.12)]'
                : 'mt-1 h-2.5 w-2.5 shrink-0 rounded-full border border-gilded bg-vellum'
          }
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="font-display text-[10px] uppercase tracking-display text-gilded">
            {copy.eyebrow}
          </p>
          <h2 className="mt-1 font-serif text-lg text-ink-brown">
            {copy.title}
          </h2>
          <p className="mt-1 max-w-2xl font-sans text-xs leading-relaxed text-sepia">
            {copy.detail}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <div className="hidden gap-1.5 sm:flex">
          {['Claude Code', 'Codex', 'Workbuddy'].map((client) => (
            <span
              key={client}
              className="rounded-full border border-paper-edge px-2 py-0.5 font-mono text-[10px] text-sepia"
            >
              {client}
            </span>
          ))}
        </div>
        <Link
          href={copy.href}
          className="inline-flex h-9 items-center rounded-sm bg-ink-brown px-4 font-serif text-sm text-vellum transition-colors hover:bg-wax-red"
        >
          {copy.cta} →
        </Link>
      </div>
    </section>
  );
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
