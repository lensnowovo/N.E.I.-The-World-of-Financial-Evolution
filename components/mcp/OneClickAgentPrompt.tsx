'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * 一键复制给 AI agent 的 MCP 配置 prompt。
 *
 * 用户把刚生成的 MCP Token 粘进输入框，prompt 自动把 token 并入鉴权行，
 * 一键复制就是含 token 的完整 prompt，粘贴给任意 AI 客户端（Claude Code /
 * Codex / Cursor / WorkBuddy）即可，agent 无需再向用户索要 token。
 *
 * 样式对齐提示词详情页的 <pre> 块 + PreCopyButton（linen 底 + 右上角复制钮）。
 */
export function OneClickAgentPrompt({
  mcpUrl,
  settingsUrl,
}: {
  mcpUrl: string;
  settingsUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState('');
  const trimmed = token.trim();
  const filled = filledToken(trimmed);

  // 鉴权行：填了 token 就并入；没填就提示用户输入（复制后 agent 仍会要 token）
  const authLine = filled
    ? `Authorization: Bearer ${trimmed}`
    : `Authorization: Bearer <请先在上方框里粘贴你的 N.E.I. MCP Token>`;

  const tokenNote = filled
    ? `我的 token 已写进上面的配置（${
        masked(trimmed)
      }），你直接用即可，无需再向我要。`
    : `我的 token 还没填，请先让我在上方输入框粘贴（在 ${settingsUrl} 生成，形如 nei_xxx，只显示一次请保存）。`;

  const prompt = `帮我接入 N.E.I.（一级市场 PEVC AI Skill Hub）的 MCP Server。请把它添加到你当前的 MCP 客户端配置（Claude Code 的 .mcp.json / Codex / Cursor / WorkBuddy 等都行），server 命名为 "nei-pevc"：

- 传输协议：Streamable HTTP
- URL：${mcpUrl}
- 鉴权：请求头 ${authLine}
- 可用工具：
  - search_skills：按关键词 / 场景 / 类型搜索公开 Skill
  - get_skill：取某个 Skill 的完整 Prompt 原文
  - list_my_skills：列出我在 N.E.I. 上收藏的 Skill

${tokenNote} 配好后调用一次 list_my_skills 验证连接，把返回的收藏 Skill 告诉我。如果 token 无效或连不上，提示我去 ${settingsUrl} 重新生成。`;

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
      {/* Token 输入框：粘进来就自动并入下方 prompt */}
      <div className="mb-3">
        <label
          htmlFor="mcp-token-input"
          className="block font-sans text-xs text-sepia mb-1.5"
        >
          先粘贴你的 MCP Token（可选；填了会自动并入下方 prompt，复制即可直接用）
        </label>
        <input
          id="mcp-token-input"
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder="nei_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          className="w-full h-9 bg-vellum border border-paper-edge rounded px-3 font-mono text-xs text-ink-brown placeholder:text-sepia/60 focus:border-ink-brown focus:outline-none"
        />
      </div>

      <div className="relative bg-linen rounded-md p-4 pr-14">
        <div className="font-mono text-sm text-ink-brown whitespace-pre-wrap break-words leading-relaxed">
          {prompt}
        </div>
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
        {filled
          ? '✓ 已并入 token，复制后直接粘贴给任意 AI agent（Claude Code / Codex / WorkBuddy / Cursor），它自动配 MCP。'
          : '粘贴到任意 AI agent 对话框，它自动帮你配 MCP。建议先在上方填入 token，复制出来即可直接用。'}
      </p>
    </div>
  );
}

/** 判断是否是有效的 N.E.I. token 形态（nei_ 开头） */
function filledToken(t: string): boolean {
  return t.startsWith('nei_') && t.length > 10;
}

/** token 脱敏展示（只露首尾） */
function masked(t: string): string {
  if (t.length <= 12) return t;
  return `${t.slice(0, 8)}…${t.slice(-4)}`;
}
