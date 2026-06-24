'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * 一键复制给 AI agent 的 MCP 配置 prompt。
 *
 * 用户复制这段自然语言 prompt，粘贴到任意 AI 客户端（Claude Code / Codex /
 * Cursor / WorkBuddy 等）的对话框，agent 会自动把 N.E.I. MCP Server 配好，
 * 用户只需把 token 单独发给 agent。免去手动改 .mcp.json / config。
 *
 * 样式对齐提示词详情页的 <pre> 块 + PreCopyButton（浅米底 + 右上角复制钮）。
 */
export function OneClickAgentPrompt({
  mcpUrl,
  settingsUrl,
}: {
  mcpUrl: string;
  settingsUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  const prompt = `帮我接入 N.E.I.（一级市场 PEVC AI Skill Hub）的 MCP Server。请把它添加到你当前的 MCP 客户端配置（Claude Code 的 .mcp.json / Codex / Cursor / WorkBuddy 等都行），server 命名为 "nei-pevc"：

- 传输协议：Streamable HTTP
- URL：${mcpUrl}
- 鉴权：请求头 Authorization: Bearer <请向我要 N.E.I. MCP Token>
- 可用工具：
  - search_skills：按关键词 / 场景 / 类型搜索公开 Skill
  - get_skill：取某个 Skill 的完整 Prompt 原文
  - list_my_skills：列出我在 N.E.I. 上收藏的 Skill

我的 token 会单独发给你（在 ${settingsUrl} 生成，形如 nei_xxx，只显示一次请保存好）。你拿到 token 后完成配置，然后调用一次 list_my_skills 验证连接，把返回的收藏 Skill 告诉我。如果 token 无效或连不上，提示我去 ${settingsUrl} 重新生成。`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = prompt;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta);
    }
  };

  return (
    <div className="my-4">
      <div className="relative bg-vellum/40 border border-paper-edge rounded p-4 pr-14">
        <pre className="font-mono text-sm text-ink-brown whitespace-pre-wrap break-words leading-relaxed">
          {prompt}
        </pre>
        <button
          type="button"
          onClick={onCopy}
          className={cn(
            'absolute top-2 right-2 z-10 inline-flex items-center gap-1.5 h-7 px-2.5',
            'text-[11px] font-sans rounded-sm border backdrop-blur-[1px] transition-colors',
            copied
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/90'
              : 'border-paper-edge bg-vellum/80 text-leather hover:text-ink-brown hover:border-ink-brown',
          )}
          title="复制 prompt"
        >
          {copied ? (
            <>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M2 6.5 L5 9.5 L10 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              已复制
            </>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
                <rect x="3.5" y="3.5" width="6" height="6" rx="0.5" />
                <path d="M2 7.5 V2 H7.5" strokeLinecap="round" />
              </svg>
              复制
            </>
          )}
        </button>
      </div>
      <p className="mt-2 font-sans text-xs text-sepia">
        粘贴到任意 AI agent（Claude Code / Codex / WorkBuddy / Cursor）的对话框，它自动帮你配 MCP。把你的 token 单独发它即可。
      </p>
    </div>
  );
}
