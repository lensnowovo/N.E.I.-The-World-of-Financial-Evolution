export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublicBaseUrl } from '@/lib/public-url';
import { prisma } from '@/lib/db';
import { POST_STATUS } from '@/lib/status';
import { extractReadableText } from '@/lib/skill-text';

export const metadata: Metadata = {
  title: 'N.E.I. MCP Server 说明与排障',
  description:
    '了解 N.E.I. MCP Server 的安全边界、可用工具、推荐客户端与连接排障。连接操作请前往 /connect。',
  alternates: {
    canonical: '/mcp',
  },
  openGraph: {
    title: 'N.E.I. MCP Server 说明与排障',
    description:
      '了解 N.E.I. MCP Server 的安全边界、可用工具、推荐客户端与连接排障。',
    url: '/mcp',
    type: 'article',
    siteName: 'N.E.I.',
    images: [{ url: '/share-cover.png', width: 1200, height: 630, alt: 'N.E.I. MCP Server 说明与排障' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'N.E.I. MCP Server 说明与排障',
    description:
      '了解 N.E.I. MCP Server 的安全边界、可用工具、推荐客户端与连接排障。',
    images: ['/share-cover.png'],
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
    name: 'N.E.I. MCP Server 说明与排障',
    description: '了解 N.E.I. MCP Server 的安全边界、可用工具、推荐客户端与连接排障。',
    url: `${baseUrl}/mcp`,
    inLanguage: 'zh-CN',
    step: [
      { '@type': 'HowToStep', position: 1, name: '登录并生成 Token', text: '前往连接配置页生成 N.E.I. MCP Token。' },
      { '@type': 'HowToStep', position: 2, name: '配置 MCP Server', text: `在客户端配置 Streamable HTTP Server：${mcpUrl}` },
      { '@type': 'HowToStep', position: 3, name: '调用 search_skills', text: '在客户端调用 search_skills 搜索公开 MCP-ready Skill 全库；收藏库只是常用 Skill 的沉淀。' },
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
        <h1 className="font-serif text-3xl text-ink-brown mb-1">MCP Server 说明与排障</h1>
        <p className="font-sans text-sm text-sepia">
          这里解释 MCP 做什么、支持哪些工具、以及连不上时怎么排查。实际连接请从连接配置页开始。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        <div className="prose-manuscript max-w-none">
          <h2>这是什么？</h2>
          <p>
            N.E.I. MCP Server 是一个 <strong>Skill 分发 + 连接器目录索引 + Prompt 仓库</strong>。
            它让你的 AI 客户端通过 MCP 协议搜索、读取和调用 N.E.I. 上的 PEVC Skill，
            同时提供外部数据源连接器目录，让 Agent 知道“缺什么来源、能补什么 MCP”。
          </p>
          <p className="font-serif italic text-sm text-sepia mt-2">
            N.E.I. 是图书馆管理员——它给你一本按主题分类的卡片目录和加载指令。
            真正“智能”的是你自己的 Agent：它决定补不补、补哪个、怎么配合 Skill 用。
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

          <h2>最快连接路径</h2>
          <ol>
            <li>前往 <Link href="/connect" className="text-wax-red underline">连接配置页</Link> 登录并生成 MCP Token。</li>
            <li>复制一键配置 Prompt 或 JSON，粘贴到 Claude Code、Codex、Workbuddy 或其它 Agent 客户端。</li>
            <li>在客户端调用 <code>search_skills</code> 或 <code>recommend_skills_for_task</code> 搜索公开 Skill 全库。</li>
            <li>遇到好用的 Skill，再调用 <code>favorite_skill</code> 沉淀到你的收藏库；之后可用 <code>list_my_skills</code> 快速读取。</li>
          </ol>

          <div className="not-prose my-5 rounded-md border border-gilded/40 bg-gilded/5 p-4">
            <h2 className="font-serif text-xl text-ink-brown mb-2">推荐从 /connect 开始</h2>
            <p className="font-sans text-sm leading-7 text-leather">
              为了减少复制 Token、拼 Headers 和找配置格式的步骤，N.E.I. 把 Token 生成和配置包复制都集中到了连接配置页。
              本页只保留说明、工具清单和排障。
            </p>
            <Link href="/connect" className="mt-3 inline-flex h-10 items-center rounded-sm bg-ink-brown px-5 font-serif text-sm text-vellum transition-colors hover:bg-wax-red">
              去连接配置页 →
            </Link>
          </div>

          <h2>手动配置参数</h2>
          <div className="bg-vellum/60 border border-paper-edge rounded-md p-4 mb-4">
            <p className="font-sans text-xs text-sepia mb-2">MCP Server 地址：</p>
            <code className="font-mono text-sm text-ink-brown">{mcpUrl}</code>
          </div>
          <ul>
            <li>类型：Streamable HTTP</li>
            <li>URL：<code>{mcpUrl}</code></li>
            <li>Headers：<code>Authorization: Bearer 你的Token</code></li>
          </ul>

          <h2>客户端兼容性</h2>
          <ul>
            <li><strong>优先推荐</strong>：Claude Code、Codex、Workbuddy 或其它 Agent 客户端。</li>
            <li><strong>暂不推荐</strong>：豆包。当前实测连接不稳定，暂不作为 N.E.I. MCP 的推荐客户端；等有明确可用的 MCP Client 配置方式后再补教程。</li>
            <li><strong>其他客户端</strong>：需要支持 Streamable HTTP MCP Server，并允许配置 Authorization 请求头。</li>
          </ul>

          <h2>可用 MCP 工具</h2>

          <h3 className="font-serif text-lg text-ink-brown mt-4">Skill 分发</h3>
          <ul>
            <li><strong>search_skills</strong>：按关键词、任务阶段、场景、类型、行业搜索公开 MCP-ready Skill 全库，返回结构化结果，不要求先收藏</li>
            <li><strong>recommend_skills_for_task</strong>：按 BP 初筛、行研、IC Memo、LP 汇报等任务从全库推荐 Skill 组合；同时返回 <code>suggestedConnectors</code> 字段，按任务提示可补充的外部 MCP / API 数据源</li>
            <li><strong>list_disciplines</strong>：列出 N.E.I. 可通过 MCP 加载的 Agent 工作纪律</li>
            <li><strong>get_default_discipline</strong>：获取默认工作纪律原文，建议在执行 PEVC Skill 前加载</li>
            <li><strong>get_skill</strong>：获取某个 Skill 的完整 Prompt / Workflow 原文</li>
            <li><strong>list_my_skills</strong>：列出你收藏且已准入 MCP 的 Skill；收藏库是常用 Skill 的个人 shortlist，不是使用 MCP 的前置条件</li>
            <li><strong>apply_skill</strong>：把上下文填入 Prompt 模板，返回可执行 Prompt</li>
            <li><strong>favorite_skill</strong>：从客户端把公开 Skill 加入收藏库</li>
            <li><strong>unfavorite_skill</strong>：从收藏库移除 Skill，需要 <code>confirm=true</code> 二次确认</li>
          </ul>

          <h3 className="font-serif text-lg text-ink-brown mt-4">连接器目录索引</h3>
          <ul>
            <li><strong>list_connectors</strong>：按 category / kind / status 浏览所有外部 MCP / API 连接器（Agent 主动发现数据源）</li>
            <li><strong>get_connector</strong>：查单个连接器完整元数据（覆盖范围、PEVC 用途、安全提示），不含 setup prompt</li>
            <li><strong>search_connectors</strong>：按关键词搜连接器（名字 / 覆盖 / 用途），适合按主题找数据源</li>
            <li><strong>recommend_connectors_for_task</strong>：按任务推荐可补充的外部数据源（关键词命中规则表，最多 3 条）</li>
            <li><strong>get_connector_setup_prompt</strong>：用户确认后（<code>confirmed=true</code>），按 connector_id 拿到加载该外部 MCP 的完整 Prompt</li>
          </ul>

          <h2>外部数据源：目录索引 + Prompt 仓库</h2>
          <p>
            N.E.I. 不替 Agent 决定补什么，只提供四条路让 Agent 自己发现和获取外部数据源：
          </p>
          <ol>
            <li><strong>主动浏览</strong>：调 <code>list_connectors</code> 按分类 / 类型 / 状态浏览所有连接器。</li>
            <li><strong>按主题搜</strong>：调 <code>search_connectors(&quot;clinical trials&quot;)</code> 按关键词找。</li>
            <li><strong>按任务推荐</strong>：调 <code>recommend_skills_for_task</code> 或 <code>recommend_connectors_for_task</code>，N.E.I. 按关键词命中规则表提示“这类任务通常补 XX 更有用”。</li>
            <li><strong>拿加载指令</strong>：用户确认后，调 <code>get_connector_setup_prompt(connector_id, confirmed=true)</code> 拿加载 Prompt。Agent 在本地装外部 MCP，N.E.I. 不代理调用。</li>
          </ol>
          <p className="font-serif italic text-sm text-sepia mt-2">
            当前已收录的连接器目录见 <Link href="/mcp-library" className="text-wax-red underline">/mcp-library</Link>。扩展只需改 <code>lib/mcp-library.ts</code> 规则表，不需要改后端逻辑。
          </p>

          <h2>推荐任务示例</h2>
          <ul>
            <li>用 N.E.I. 帮我初筛这个 BP，给出是否进入立项的理由。</li>
            <li>用 N.E.I. 生成一份商业尽调访谈问题清单。</li>
            <li>用 N.E.I. 写一份 IC Memo 的一级结构和关键风险。</li>
            <li>用 N.E.I. 帮我起草投后月报，并列出需要补充的数据。</li>
            <li>用 N.E.I. 起草一份给政府引导基金的正式回复函。</li>
          </ul>

          <h2>连不上时先查这几项</h2>
          <ul>
            <li>确认 Server URL 是 <code>{mcpUrl}</code>，不是旧的 Vercel 域名。</li>
            <li>确认请求头是 <code>Authorization: Bearer 你的Token</code>，中间有空格。</li>
            <li>确认 Token 没有泄露或重新生成；重新生成后旧 Token 会失效。</li>
            <li>如果 <code>list_my_skills</code> 返回空列表，说明你还没有收藏；可以先用 <code>search_skills</code> 搜全库，不影响 MCP 使用。</li>
            <li>如果客户端不支持 Streamable HTTP 或不能加 Authorization Header，就暂时无法连接。</li>
          </ul>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start space-y-4">
          <div className="border border-paper-edge bg-vellum rounded-md p-4">
            <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-2">快速操作</p>
            <Link href="/connect" className="block font-serif text-sm text-wax-red hover:underline mb-2">
              → 开始连接 MCP
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
