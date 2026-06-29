'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';

type McpQuickSetupPanelProps = {
  token: string;
  hasExistingToken: boolean;
  generating: boolean;
  mcpUrl: string;
  connectUrl: string;
  onGenerate: () => Promise<void> | void;
};

type CopyTarget = 'prompt' | 'json' | 'url' | 'token' | null;

export function McpQuickSetupPanel({
  token,
  hasExistingToken,
  generating,
  mcpUrl,
  connectUrl,
  onGenerate,
}: McpQuickSetupPanelProps) {
  const [copied, setCopied] = useState<CopyTarget>(null);
  const hasVisibleToken = token.trim().length > 0;

  const jsonConfig = useMemo(
    () => buildJsonConfig(mcpUrl, hasVisibleToken ? token.trim() : '<你的 N.E.I. MCP Token>'),
    [mcpUrl, token, hasVisibleToken],
  );
  const setupPrompt = useMemo(
    () => buildSetupPrompt({
      mcpUrl,
      connectUrl,
      token: hasVisibleToken ? token.trim() : null,
    }),
    [mcpUrl, connectUrl, token, hasVisibleToken],
  );

  const copy = async (target: Exclude<CopyTarget, null>, text: string) => {
    await copyText(text);
    setCopied(target);
    setTimeout(() => setCopied(null), 2200);
  };

  return (
    <div className="rounded-lg border-2 border-gilded/40 bg-gilded/5 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display tracking-display text-[10px] uppercase text-sepia mb-2">MCP Quick Setup</p>
          <h2 className="font-serif text-2xl text-ink-brown">三步连接 MCP</h2>
          <p className="mt-2 font-sans text-sm leading-7 text-leather">
            生成 Token 后，复制下方配置到 Claude Code、Cursor 或 Windsurf。配好后调用
            <code className="mx-1 rounded-sm bg-vellum px-1 py-0.5 font-mono text-[12px]">list_my_skills</code>
            验证连接。
          </p>
        </div>

        <Button type="button" onClick={onGenerate} disabled={generating}>
          {generating
            ? '生成中…'
            : hasExistingToken
              ? '重新生成配置包'
              : '生成 Token 与配置包'}
        </Button>
      </div>

      <div className="mt-5 rounded-md border border-wax-red/25 bg-wax-red/5 px-4 py-3">
        <p className="font-sans text-xs leading-6 text-ink-brown">
          Token 只显示一次。只把配置复制到你信任的本地或已登录 AI 客户端；不要发到陌生网页、群聊、截图、共享文档或不可信 Agent。
          如果 Token 泄露，请立即在本页重新生成。
        </p>
      </div>

      <div className="mt-3 rounded-md border border-paper-edge bg-vellum/70 px-4 py-3">
        <p className="font-sans text-xs leading-6 text-leather">
          推荐先用 Claude Code、Cursor 或 Windsurf 连接。豆包暂未验证通过，不建议作为首选 MCP 客户端。
        </p>
      </div>

      {hasVisibleToken ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-md border border-paper-edge bg-vellum p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-sans text-xs text-sepia mb-1">你的 MCP Token（只显示一次）</p>
                <code className="block break-all font-mono text-sm text-ink-brown">{token}</code>
              </div>
              <CopyButton active={copied === 'token'} onClick={() => copy('token', token)}>
                {copied === 'token' ? '已复制' : '复制 Token'}
              </CopyButton>
            </div>
          </div>

          <SetupCopyCard
            title="推荐：复制一键配置 Prompt"
            description="粘贴到 Claude Code、Cursor 或 Windsurf。它会按安全前提保存 MCP Server，并调用 list_my_skills 验证连接。"
            body={setupPrompt}
            active={copied === 'prompt'}
            onCopy={() => copy('prompt', setupPrompt)}
            buttonText="复制一键配置 Prompt"
          />

          <SetupCopyCard
            title="备用：复制 MCP JSON 配置"
            description="适合支持直接粘贴 JSON 配置的客户端。已自动带入当前 Token。"
            body={jsonConfig}
            active={copied === 'json'}
            onCopy={() => copy('json', jsonConfig)}
            buttonText="复制 JSON"
            code
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <EmptyStep number="01" title="收藏 Skill" text="先收藏至少一个你想在客户端调用的 Skill。" />
          <EmptyStep number="02" title="生成配置包" text={hasExistingToken ? '已有 Token；如需明文配置包，请重新生成。' : '点击上方按钮生成 Token。'} />
          <EmptyStep number="03" title="粘贴到客户端" text="复制 Prompt 或 JSON，粘贴到 Claude Code / Cursor / Windsurf。" />
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-paper-edge pt-4">
        <CopyButton active={copied === 'url'} onClick={() => copy('url', mcpUrl)}>
          {copied === 'url' ? '已复制地址' : '复制 Server URL'}
        </CopyButton>
        <Link href="/mcp" className="font-serif text-sm italic text-leather hover:text-ink-brown">
          查看原理与排障 →
        </Link>
        <Link href="/security" className="font-serif text-sm italic text-leather hover:text-ink-brown">
          安全边界 →
        </Link>
      </div>
    </div>
  );
}

function SetupCopyCard({
  title,
  description,
  body,
  active,
  onCopy,
  buttonText,
  code,
}: {
  title: string;
  description: string;
  body: string;
  active: boolean;
  onCopy: () => void;
  buttonText: string;
  code?: boolean;
}) {
  return (
    <div className="rounded-md border border-paper-edge bg-vellum/70 p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-serif text-lg text-ink-brown">{title}</h3>
          <p className="mt-1 font-sans text-xs leading-5 text-sepia">{description}</p>
        </div>
        <CopyButton active={active} onClick={onCopy}>
          {active ? '已复制' : buttonText}
        </CopyButton>
      </div>
      <pre
        className={cn(
          'max-h-72 overflow-auto rounded-sm border border-paper-edge bg-linen p-3 text-ink-brown',
          code ? 'font-mono text-xs leading-5' : 'font-sans text-xs leading-6 whitespace-pre-wrap',
        )}
      >
        {body}
      </pre>
    </div>
  );
}

function CopyButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-9 shrink-0 items-center justify-center rounded-sm border px-3 font-serif text-sm transition-colors',
        active
          ? 'border-moss/50 bg-moss/10 text-moss'
          : 'border-ink-brown text-ink-brown hover:bg-ink-brown hover:text-vellum',
      )}
    >
      {children}
    </button>
  );
}

function EmptyStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="rounded-md border border-paper-edge bg-vellum/70 p-4">
      <p className="font-mono text-[11px] text-sepia">{number}</p>
      <h3 className="mt-2 font-serif text-base text-ink-brown">{title}</h3>
      <p className="mt-1 font-sans text-xs leading-5 text-leather">{text}</p>
    </div>
  );
}

function buildJsonConfig(mcpUrl: string, token: string) {
  return JSON.stringify(
    {
      mcpServers: {
        'nei-pevc': {
          url: mcpUrl,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      },
    },
    null,
    2,
  );
}

function buildSetupPrompt({
  mcpUrl,
  connectUrl,
  token,
}: {
  mcpUrl: string;
  connectUrl: string;
  token: string | null;
}) {
  const authLine = token
    ? `Authorization: Bearer ${token}`
    : 'Authorization: Bearer <你的 N.E.I. MCP Token>';
  const tokenNote = token
    ? `我已经把 Token 写进鉴权行。请只把这段配置保存到我信任的本地或已登录 AI 客户端。`
    : `我的 Token 还没填。请提醒我先去 ${connectUrl} 生成 Token，再把 Token 只粘贴到我信任的本地或已登录 AI 客户端。`;

  return `请帮我在当前受信任的 AI 客户端中接入 N.E.I.（一级市场 PEVC AI Skill Hub）的 MCP Server，命名为 "nei-pevc"。

推荐客户端：
- Claude Code
- Cursor
- Windsurf
- 豆包当前未验证通过，请不要优先使用豆包配置这个 MCP。

安全前提：
- 只在我信任的本地客户端或已登录客户端中保存这个 Token。
- 不要把 MCP Token 发送到陌生网页、群聊、截图、共享文档或不可信 Agent。
- 如果 Token 已泄露，请提醒我立即在 ${connectUrl} 重置。
- N.E.I. MCP 只分发 Skill / Workflow，不读取本地文件、不上传项目材料。

配置：
- 传输协议：Streamable HTTP
- URL：${mcpUrl}
- 鉴权：请求头 ${authLine}
- 可用工具：
  - search_skills：按关键词 / 场景 / 类型搜索公开 Skill
  - recommend_skills_for_task：按 BP 初筛、行研、IC Memo、LP 汇报等任务推荐 Skill 组合
  - get_skill：获取某个 Skill 的完整 Prompt / Workflow 原文
  - list_my_skills：列出我在 N.E.I. 收藏且已准入 MCP 的 Skill
  - apply_skill：把上下文填入 Prompt 模板，返回可执行 Prompt
  - favorite_skill / unfavorite_skill：收藏或取消收藏 Skill

${tokenNote}

配好后请调用一次 list_my_skills 验证连接，并告诉我是否能看到我的收藏 Skill。`;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}
