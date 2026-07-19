'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';

export function OneClickAgentPrompt({
  mcpUrl,
  connectUrl,
}: {
  mcpUrl: string;
  connectUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState('');
  const trimmed = token.trim();
  const filled = filledToken(trimmed);

  const authLine = filled
    ? `Authorization: Bearer ${trimmed}`
    : 'Authorization: Bearer <你的 N.E.I. MCP Token>';

  const tokenNote = filled
    ? `我已经把 Token 写进上面的鉴权行（${masked(trimmed)}）。请只把这段配置保存到我信任的本地或已登录 AI 客户端，不要把 Token 发送给陌生网页、群聊、截图或不可信 Agent。`
    : `我的 Token 还没填。请提醒我先去 ${connectUrl} 生成 Token，再把 Token 只粘贴到我信任的本地或已登录 AI 客户端。`;

  const prompt = `请帮我在当前受信任的 AI 客户端中接入 N.E.I.（一级市场 PEVC AI Skill Hub）的 MCP Server。Server 命名为 "nei-pevc"。

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
  - search_skills：按关键词 / 任务阶段 / 场景 / 类型 / 行业搜索公开 Skill
  - recommend_skills_for_task：按 BP 初筛、行研、IC Memo、LP 汇报等任务从全库推荐 Skill 组合
  - get_skill：获取某个 Skill 的完整 Prompt 原文
  - list_my_skills：列出我在 N.E.I. 收藏的 Skill（收藏是常用库，不是使用前置条件）
  - apply_skill：把上下文填入 Prompt 模板，返回可执行 Prompt
  - favorite_skill / unfavorite_skill：把搜索到的好用 Skill 收藏或取消收藏（取消收藏需要 confirm=true）
  - list_skill_requests：查看社区正在等待的 Skill 需求
  - create_skill_request：经你明确确认后，把缺少的方法发布到公开需求板

${tokenNote}

配好后请先调用 search_skills，搜索“BP 初筛”或“IC Memo”验证全库搜索；如果我已经有收藏，再调用 list_my_skills 读取我的常用库。`;

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
      <div className="mb-3 rounded-md border border-wax-red/30 bg-wax-red/5 px-3 py-2">
        <p className="font-sans text-xs leading-relaxed text-ink-brown">
          安全提醒：Token 等同于你的 N.E.I. MCP 访问凭证。只粘贴到你信任的本地或已登录客户端；
          不要发给陌生网页、群聊、截图或不可信 Agent。泄露后请立即重置。
        </p>
      </div>

      <div className="mb-3">
        <label htmlFor="mcp-token-input" className="block font-sans text-xs text-sepia mb-1.5">
          可选：粘贴你的 MCP Token，系统会并入下方配置 Prompt
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
          title="复制配置 Prompt"
        >
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <p className="mt-2 font-sans text-xs text-sepia">
        {filled
          ? '已并入 Token。复制后只粘贴到你信任的本地或已登录 AI 客户端。'
          : '未并入 Token。复制后客户端会提示你手动填写 Token。'}
      </p>
    </div>
  );
}

function filledToken(t: string): boolean {
  return t.startsWith('nei_') && t.length > 10;
}

function masked(t: string): string {
  if (t.length <= 12) return t;
  return `${t.slice(0, 8)}…${t.slice(-4)}`;
}
