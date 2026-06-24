'use client';

import { useState } from 'react';

/**
 * 一键复制给 AI agent 的 MCP 配置 prompt。
 *
 * 用户复制这段自然语言 prompt，粘贴到任意 AI 客户端（Claude Code / Codex /
 * Cursor / WorkBuddy 等）的对话框，agent 会自动把 N.E.I. MCP Server 配好，
 * 用户只需把 token 单独发给 agent。免去手动改 .mcp.json / config。
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
      /* 剪贴板被拦截时，提示用户手动选中文本复制 */
      setCopied(false);
    }
  };

  return (
    <div className="my-4">
      <div className="relative bg-ink-brown text-vellum rounded-md p-4 pr-3 overflow-x-auto">
        <pre className="text-xs font-mono whitespace-pre-wrap break-words leading-relaxed">{prompt}</pre>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center h-9 px-4 bg-wax-red text-vellum hover:bg-ink-brown font-serif text-sm rounded-sm transition-colors"
        >
          {copied ? '✓ 已复制' : '一键复制 prompt'}
        </button>
        <span className="font-sans text-xs text-sepia">
          粘贴到任意 AI agent 对话框，它自动帮你配 MCP。把你的 token 单独发它即可。
        </span>
      </div>
    </div>
  );
}
