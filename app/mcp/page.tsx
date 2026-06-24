export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { OneClickAgentPrompt } from '@/components/mcp/OneClickAgentPrompt';

export default async function McpGuidePage() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://n-e-i-the-world-of-financial-evolut.vercel.app';
  const mcpUrl = `${baseUrl}/api/mcp`;

  return (
    <div className="mx-auto max-w-page px-4 sm:px-6 py-8">
      <div className="mb-6 pb-5 border-b border-paper-edge">
        <Link href="/" className="inline-flex items-center gap-1.5 font-serif italic text-sm text-sepia hover:text-ink-brown mb-3">
          ← 返回首页
        </Link>
        <h1 className="font-serif text-3xl text-ink-brown mb-1">MCP Server 配置指南</h1>
        <p className="font-sans text-sm text-sepia">
          把 N.E.I. 上的 Skill 接入你的 AI 客户端，在客户端里直接搜索和调用
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        {/* 左：主内容 */}
        <div className="prose-manuscript max-w-none">
          <h2>这是什么？</h2>
          <p>
            N.E.I. MCP Server 让你的 AI 客户端（Claude Code / Cursor / Kimi 等）能通过 MCP 协议
            搜索和获取 N.E.I. 上的 Skill。你在客户端里说一个需求，客户端就能自动找到相关的 Prompt 并执行。
          </p>

          <h2>配置步骤</h2>
          <h3>第 1 步：生成 Token</h3>
          <p>
            去{' '}
            <Link href="/settings" className="text-wax-red underline">设置页</Link>
            {' '}生成一个 MCP Token。Token 只显示一次，请保存好。
          </p>

          <h3>第 2 步：在客户端配置 MCP Server</h3>

          <h4>方式一（推荐）：一键复制 prompt 给 AI agent</h4>
          <p>
            不想手动改配置文件？复制下面这段 prompt，粘贴到任意 AI agent（Claude Code / Codex /
            Cursor / WorkBuddy）的对话框，它会自动帮你把 MCP 配好——你只需把 token 单独发给它。
          </p>
          <OneClickAgentPrompt mcpUrl={mcpUrl} settingsUrl={`${baseUrl}/settings`} />

          <h4>方式二：手动配置</h4>

          <div className="bg-vellum/60 border border-paper-edge rounded-md p-4 mb-4">
            <p className="font-sans text-xs text-sepia mb-2">MCP Server 地址（所有客户端通用）：</p>
            <code className="font-mono text-sm text-ink-brown">{mcpUrl}</code>
          </div>

          <h4>Claude Code</h4>
          <div className="bg-linen text-ink-brown rounded-md p-4 text-xs font-mono overflow-x-auto whitespace-pre">
{`# 在项目根目录的 .mcp.json 或 ~/.claude/mcp_settings.json
{
  "mcpServers": {
    "nei": {
      "url": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer 你的Token"
      }
    }
  }
}`}
          </div>

          <h4>Cursor</h4>
          <p>
            Settings → MCP → Add MCP Server → 选 Streamable HTTP → 填入：
          </p>
          <ul>
            <li>URL: <code>{mcpUrl}</code></li>
            <li>Headers: <code>Authorization: Bearer 你的Token</code></li>
          </ul>

          <h4>Kimi / 其他支持 MCP 的客户端</h4>
          <p>
            在客户端的 MCP 配置里添加一个 Streamable HTTP 类型的 server，
            URL 填 <code>{mcpUrl}</code>，请求头加
            <code> Authorization: Bearer 你的Token</code>。
          </p>

          <h3>第 3 步：收藏你想用的 Skill</h3>
          <p>
            在 N.E.I. 网站上收藏你感兴趣的 Skill（点帖子的「收藏」按钮）。
            收藏后，在客户端里调用 <code>list_my_skills</code> 就能看到它们。
          </p>

          <h2>可用的 MCP 工具</h2>
          <ul>
            <li><strong>search_skills</strong>：按关键词、场景、类型搜索公开 Skill</li>
            <li><strong>get_skill</strong>：获取某个 Skill 的完整 Prompt 原文</li>
            <li><strong>list_my_skills</strong>：列出你收藏的 Skill</li>
          </ul>

          <h2>使用示例</h2>
          <p>
            配置完成后，在你的客户端里这样说：
          </p>
          <blockquote>
            “帮我做一个合成生物学赛道的尽调，用 N.E.I. 上的 Skill”
          </blockquote>
          <p>
            客户端会自动调用 <code>search_skills</code> 或 <code>list_my_skills</code>，
            找到相关的 Prompt，拿到原文后用你客户端自己的 AI 额度执行。
          </p>
        </div>

        {/* 右：侧边 */}
        <aside className="lg:sticky lg:top-6 lg:self-start space-y-4">
          <div className="border border-paper-edge bg-vellum rounded-md p-4">
            <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-2">快速操作</p>
            <Link href="/settings" className="block font-serif text-sm text-wax-red hover:underline mb-2">
              → 生成 / 管理 Token
            </Link>
            <Link href="/" className="block font-serif text-sm text-leather hover:text-ink-brown">
              → 浏览 Skill
            </Link>
          </div>

          <div className="border border-paper-edge bg-vellum/50 rounded-md p-4">
            <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-2">原理</p>
            <p className="font-sans text-xs text-leather leading-relaxed">
              N.E.I. 只负责分发 Skill 内容（Prompt 原文）。
              AI 执行用的是你自己客户端的额度——平台零成本，你无需配置 API key。
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
