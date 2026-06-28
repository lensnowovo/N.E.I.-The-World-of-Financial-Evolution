export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { OneClickAgentPrompt } from '@/components/mcp/OneClickAgentPrompt';
import { getPublicBaseUrl } from '@/lib/public-url';
import { prisma } from '@/lib/db';
import { POST_STATUS } from '@/lib/status';
import { extractReadableText } from '@/lib/skill-text';

export const metadata: Metadata = {
  title: 'N.E.I. MCP Server 配置指南',
  description:
    '把 N.E.I. 收藏的 PEVC Skill / Workflow 接入 Claude Code、Cursor、Windsurf 等 AI 客户端的配置指南。',
  alternates: {
    canonical: '/mcp',
  },
  openGraph: {
    title: 'N.E.I. MCP Server 配置指南',
    description:
      '把 N.E.I. 收藏的 PEVC Skill / Workflow 接入 Claude Code、Cursor、Windsurf 等 AI 客户端。',
    url: '/mcp',
    type: 'article',
    siteName: 'N.E.I.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'N.E.I. MCP Server 配置指南' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'N.E.I. MCP Server 配置指南',
    description:
      '把 N.E.I. 收藏的 PEVC Skill / Workflow 接入 Claude Code、Cursor、Windsurf 等 AI 客户端。',
    images: ['/twitter-image'],
  },
};

export default async function McpGuidePage() {
  const baseUrl = getPublicBaseUrl();
  const mcpUrl = `${baseUrl}/api/mcp`;
  const connectUrl = `${baseUrl}/connect`;
  const defaultDiscipline = await prisma.post.findFirst({
    where: {
      status: POST_STATUS.PUBLISHED,
      deletedAt: null,
      mcpApproved: true,
      OR: [
        { body: { contains: 'slug:nei-discipline/fiduciary-research-v1' } },
        { skillAsset: { is: { assetType: 'agent-discipline' } } },
      ],
    },
    select: {
      id: true,
      title: true,
      body: true,
      skillAsset: { select: { usageNotes: true } },
    },
    orderBy: { id: 'asc' },
  });
  const mcpJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'N.E.I. MCP Server 配置指南',
    description: '把 N.E.I. 收藏的 PEVC Skill / Workflow 接入受信任的 AI 客户端。',
    url: `${baseUrl}/mcp`,
    inLanguage: 'zh-CN',
    step: [
      { '@type': 'HowToStep', position: 1, name: '登录并生成 Token', text: '前往连接配置页生成 N.E.I. MCP Token。' },
      { '@type': 'HowToStep', position: 2, name: '配置 MCP Server', text: `在客户端配置 Streamable HTTP Server：${mcpUrl}` },
      { '@type': 'HowToStep', position: 3, name: '调用 list_my_skills', text: '收藏至少一个 Skill 后，在客户端调用 list_my_skills 验证连接。' },
    ],
  };

  return (
    <div className="mx-auto max-w-page px-4 sm:px-6 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(mcpJsonLd) }}
      />
      <div className="mb-6 pb-5 border-b border-paper-edge">
        <Link href="/" className="inline-flex items-center gap-1.5 font-serif italic text-sm text-sepia hover:text-ink-brown mb-3">
          ← 返回首页
        </Link>
        <h1 className="font-serif text-3xl text-ink-brown mb-1">MCP Server 配置指南</h1>
        <p className="font-sans text-sm text-sepia">
          把 N.E.I. 收藏的 Skill / Workflow 接进 Claude Code、Cursor、Windsurf 等 AI 客户端。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        <div className="prose-manuscript max-w-none">
          <h2>这是什么？</h2>
          <p>
            N.E.I. MCP Server 让你的 AI 客户端通过 MCP 协议搜索、读取和调用 N.E.I. 上的 PEVC Skill。
            你可以先在网站收藏 Skill，再在客户端里调用 <code>list_my_skills</code> 读取自己的收藏库。
          </p>

          <div className="not-prose my-5 rounded-md border border-wax-red/30 bg-wax-red/5 p-4">
            <p className="font-display tracking-display text-[10px] text-wax-red uppercase mb-2">
              安全边界
            </p>
            <p className="font-sans text-sm leading-7 text-ink-brown">
              N.E.I. MCP 只返回 Skill 和 Workflow 文本，不读取你的本地文件，不上传你的 BP、财务模型、
              投委会材料或 LP 名单，不把客户端执行结果发送到第三方。任何本地文件读取、联网查询、
              外部 MCP 调用都由你的 AI 客户端和你本人确认。
            </p>
            <Link href="/security" className="mt-2 inline-flex font-serif italic text-sm text-wax-red hover:underline">
              查看 MCP 安全与保密原则 →
            </Link>
          </div>

          {defaultDiscipline && (
            <div className="not-prose my-5 rounded-md border border-gilded/40 bg-gilded/5 p-4">
              <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-2">
                默认工作纪律
              </p>
              <h2 className="font-serif text-xl text-ink-brown mb-2">
                {defaultDiscipline.title}
              </h2>
              <p className="font-sans text-sm leading-7 text-leather">
                {defaultDiscipline.skillAsset?.usageNotes ||
                  cleanText(extractReadableText(defaultDiscipline.body), 150)}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link href={`/posts/${defaultDiscipline.id}`} className="font-serif italic text-sm text-wax-red hover:underline">
                  查看纪律原文 →
                </Link>
                <span className="font-sans text-xs text-sepia">
                  MCP 工具：<code className="font-mono">get_default_discipline</code>
                </span>
              </div>
            </div>
          )}

          <h2>配置步骤</h2>
          <h3>第 1 步：登录并生成 Token</h3>
          <p>
            前往 <Link href="/connect" className="text-wax-red underline">连接配置页</Link> 生成 MCP Token。
            Token 只显示一次，请保存到密码管理器。泄露后可随时重置。
          </p>

          <h3>第 2 步：在客户端配置 MCP Server</h3>
          <h4>方式一：复制安全配置 Prompt</h4>
          <p>
            只把下面的 Prompt 粘贴到你信任的本地或已登录 AI 客户端。不要把 MCP Token 发给陌生网页、
            群聊、截图或不可信 Agent。
          </p>
          <OneClickAgentPrompt mcpUrl={mcpUrl} connectUrl={connectUrl} />

          <h4>方式二：手动配置</h4>
          <div className="bg-vellum/60 border border-paper-edge rounded-md p-4 mb-4">
            <p className="font-sans text-xs text-sepia mb-2">MCP Server 地址：</p>
            <code className="font-mono text-sm text-ink-brown">{mcpUrl}</code>
          </div>

          <h4>Claude Code</h4>
          <div className="bg-linen text-ink-brown rounded-md p-4 text-xs font-mono overflow-x-auto whitespace-pre">
{`{
  "mcpServers": {
    "nei-pevc": {
      "url": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer 你的Token"
      }
    }
  }
}`}
          </div>

          <h4>Cursor / Windsurf / 其他支持 MCP 的客户端</h4>
          <ul>
            <li>类型：Streamable HTTP</li>
            <li>URL：<code>{mcpUrl}</code></li>
            <li>Headers：<code>Authorization: Bearer 你的Token</code></li>
          </ul>

          <h3>第 3 步：收藏并调通</h3>
          <p>
            在 N.E.I. 网站收藏至少一个 Skill，然后在客户端调用 <code>list_my_skills</code>。
            如果能看到收藏列表，说明“收藏 → Token → 配置 → 调通”的闭环已经跑通。
          </p>

          <h2>可用 MCP 工具</h2>
          <ul>
            <li><strong>search_skills</strong>：按关键词、任务阶段、场景、类型、行业搜索公开 Skill，返回结构化结果</li>
            <li><strong>recommend_skills_for_task</strong>：按 BP 初筛、行研、IC Memo、LP 汇报等任务推荐 Skill 组合</li>
            <li><strong>list_disciplines</strong>：列出 N.E.I. 可通过 MCP 加载的 Agent 工作纪律</li>
            <li><strong>get_default_discipline</strong>：获取默认工作纪律原文，建议在执行 PEVC Skill 前加载</li>
            <li><strong>get_skill</strong>：获取某个 Skill 的完整 Prompt / Workflow 原文</li>
            <li><strong>list_my_skills</strong>：列出你收藏且已准入 MCP 的 Skill，并说明被隐藏的未准入收藏数量</li>
            <li><strong>apply_skill</strong>：把上下文填入 Prompt 模板，返回可执行 Prompt</li>
            <li><strong>favorite_skill</strong>：从客户端把公开 Skill 加入收藏库</li>
            <li><strong>unfavorite_skill</strong>：从收藏库移除 Skill，需要 <code>confirm=true</code> 二次确认</li>
          </ul>

          <h2>推荐任务示例</h2>
          <ul>
            <li>用 N.E.I. 帮我初筛这个 BP，给出是否进入立项的理由。</li>
            <li>用 N.E.I. 生成一份商业尽调访谈问题清单。</li>
            <li>用 N.E.I. 写一份 IC Memo 的一级结构和关键风险。</li>
            <li>用 N.E.I. 帮我起草投后月报，并列出需要补充的数据。</li>
            <li>用 N.E.I. 起草一份给政府引导基金的正式回复函。</li>
          </ul>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start space-y-4">
          <div className="border border-paper-edge bg-vellum rounded-md p-4">
            <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-2">快速操作</p>
            <Link href="/connect" className="block font-serif text-sm text-wax-red hover:underline mb-2">
              → 生成 / 管理 Token
            </Link>
            <Link href="/security" className="block font-serif text-sm text-leather hover:text-ink-brown mb-2">
              → 安全与保密原则
            </Link>
            <Link href="/?skill=workflow" className="block font-serif text-sm text-leather hover:text-ink-brown">
              → 浏览 Workflow
            </Link>
          </div>

          <div className="border border-paper-edge bg-vellum/50 rounded-md p-4">
            <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-2">核心原则</p>
            <p className="font-sans text-xs text-leather leading-relaxed">
              N.E.I. 只分发 Skill 内容。AI 执行用你的客户端额度，敏感项目材料留在你的客户端侧。
              Token 可随时撤销，投稿 Skill 审核后才进入 MCP。
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function cleanText(text: string, maxLength: number) {
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}
