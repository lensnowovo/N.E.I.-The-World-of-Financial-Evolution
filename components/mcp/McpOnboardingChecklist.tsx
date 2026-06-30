import Link from 'next/link';
import { cn } from '@/lib/cn';
import { TimeText } from '@/components/TimeText';

export type McpOnboardingStatus = {
  favoriteCount: number;
  hasMcpToken: boolean;
  tokenLastUsedAt: string | null;
  lastMcpCallAt?: string | null;
  hasAnyMcpCall: boolean;
  hasListMySkillsCall: boolean;
  isConnected?: boolean;
};

type Props = {
  status: McpOnboardingStatus;
  compact?: boolean;
};

export function McpOnboardingChecklist({ status, compact = false }: Props) {
  const configured = status.hasMcpToken && status.hasAnyMcpCall;
  const steps = [
    {
      key: 'library',
      title: '可搜索全库 Skill',
      done: true,
      detail: status.favoriteCount > 0
        ? `也可读取你的 ${status.favoriteCount} 个收藏 Skill`
        : '不需要先收藏；Agent 可先搜索全库，再把好用的 Skill 收藏沉淀',
      href: '/',
      cta: '浏览全库',
    },
    {
      key: 'token',
      title: '生成 MCP Token',
      done: status.hasMcpToken,
      detail: status.hasMcpToken ? 'Token 已存在；为了安全只在生成时显示明文' : '生成后复制到 Claude Code / Codex / Workbuddy 或其它 Agent 客户端的 MCP 配置中',
      href: '/connect',
      cta: '生成 Token',
    },
    {
      key: 'config',
      title: '配置 AI 客户端',
      done: Boolean(configured),
      detail: configured ? '客户端已经用 Token 打到 N.E.I.' : '按配置指南把 endpoint 和 token 填进客户端',
      href: '/mcp',
      cta: '查看配置指南',
    },
    {
      key: 'ping',
      title: '调通 MCP Server',
      done: status.hasAnyMcpCall,
      detail: status.lastMcpCallAt ? <>最近工具调用：<TimeText value={status.lastMcpCallAt} /></> : '配置后在客户端发起一次 MCP 工具调用',
      href: '/mcp',
      cta: '排查连接',
    },
    {
      key: 'list',
      title: '调用 search_skills / list_my_skills',
      done: status.hasAnyMcpCall,
      detail: status.hasListMySkillsCall
        ? '已验证可以读取你的收藏库'
        : status.hasAnyMcpCall
          ? '已验证 MCP 可调用；有收藏时可再用 list_my_skills 读常用库'
          : '先用 search_skills 搜全库；有收藏时再用 list_my_skills 读常用库',
      href: '/dashboard',
      cta: '看调用日志',
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <section className={cn('rounded-lg border border-gilded/40 bg-gilded/5', compact ? 'p-4' : 'p-5')}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-1">
            MCP Onboarding
          </p>
          <h2 className="font-serif text-lg text-ink-brown">全库搜索 → Token → 配置 → 调通 → 收藏沉淀</h2>
          <p className="font-sans text-xs text-leather mt-1 leading-relaxed">
            当前完成 {doneCount}/5。MCP 可搜索公开 Skill 全库；收藏库用于沉淀你常用的 Skill。
          </p>
        </div>
        <div className="shrink-0 rounded border border-paper-edge bg-vellum px-3 py-2 text-center">
          <p className="font-serif text-2xl text-ink-brown leading-none">{doneCount}</p>
          <p className="font-sans text-[10px] text-sepia mt-1">/ 5</p>
        </div>
      </div>

      <ol className="space-y-2">
        {steps.map((step, index) => (
          <li key={step.key} className="flex items-start gap-3 rounded border border-paper-edge bg-vellum/70 px-3 py-2">
            <span
              className={cn(
                'mt-0.5 grid h-5 w-5 shrink-0 place-content-center rounded-full border font-mono text-[10px]',
                step.done
                  ? 'border-moss bg-moss text-vellum'
                  : 'border-paper-edge bg-parchment text-sepia',
              )}
            >
              {step.done ? '✓' : index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-sm text-ink-brown">{step.title}</p>
              <p className="font-sans text-xs text-sepia leading-relaxed">{step.detail}</p>
            </div>
            {!step.done && (
              <Link href={step.href} className="shrink-0 font-serif italic text-xs text-wax-red hover:underline">
                {step.cta}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
