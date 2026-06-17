import Link from 'next/link';

/**
 * /api-docs —— 公开 REST API 文档
 *
 * 展示所有端点、参数、响应示例。让调用方（AI/工具/开发者）一眼看懂怎么用。
 * 也是项目作品集的一部分：别人访问这页就知道这站有开放 API。
 */
export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-page px-4 sm:px-6 py-8">
      {/* —— 头部 —— */}
      <header className="mb-10 pb-6 border-b border-paper-edge">
        <p className="font-display tracking-display text-[11px] text-sepia uppercase mb-1">
          N.E.I. · PEVC Skill 档案馆 · 开放 API
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl text-ink-brown mb-2">API 文档</h1>
        <p className="font-serif italic text-sm text-leather max-w-2xl">
          用代码读这个站——列出、搜索、下载 PEVC 领域的 Skill 和 Prompt。
          只读、免 key、跨域开放，让 AI 和工具直接接入。
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-10">
        {/* —— 主体内容 —— */}
        <div className="min-w-0 space-y-10">
          {/* 快速开始 */}
          <section>
            <SectionTitle id="quick">快速开始</SectionTitle>
            <CodeBlock>{`# 列出所有 Skill（默认热门排序）
curl https://你的域名/api/v1/skills

# 搜索
curl "https://你的域名/api/v1/skills?q=估值"

# 按场景筛选 + 分页
curl "https://你的域名/api/v1/skills?scene=financial&page=2&pageSize=10"

# 拿某个 Skill 的原文（prompt 纯文本 / SKILL.md 文件）
curl https://你的域名/api/v1/skills/30/raw`}</CodeBlock>
          </section>

          {/* 通用说明 */}
          <section>
            <SectionTitle id="general">通用说明</SectionTitle>
            <ul className="font-sans text-sm text-leather leading-relaxed space-y-1.5">
              <li>• <code className="font-mono text-ink-brown">Content-Type: application/json</code>（raw 端点除外，返回纯文本或重定向文件）</li>
              <li>• 所有端点支持跨域（<code className="font-mono text-ink-brown">Access-Control-Allow-Origin: *</code>），浏览器可直接调</li>
              <li>• 时间字段统一 <code className="font-mono text-ink-brown">ISO 8601</code>（如 <code className="font-mono text-ink-brown">2026-06-15T10:30:00.000Z</code>）</li>
              <li>• 列表响应统一结构：<code className="font-mono text-ink-brown">{'{ data: [...], meta: { page, pageSize, hasMore } }'}</code></li>
              <li>• 详情响应：<code className="font-mono text-ink-brown">{'{ data: {...} }'}</code></li>
              <li>• 错误：<code className="font-mono text-ink-brown">{'{ error: "..." }'}</code>，HTTP 状态码 400/404 等</li>
            </ul>
          </section>

          {/* 端点列表 */}
          <section>
            <SectionTitle id="endpoints">端点</SectionTitle>
            <div className="space-y-6">
              <Endpoint
                method="GET"
                path="/api/v1/skills"
                desc="列出 Skill，支持筛选 / 排序 / 分页"
                params={[
                  ['scene', '工作场景 value（如 financial）', '否'],
                  ['industry', '行业 value', '否'],
                  ['content', '工作内容 value，可多值（?content=memo&content=risk-id）', '否'],
                  ['skill', 'Skill 类型 value（如 prompt）', '否'],
                  ['role', 'VC / PE / FA', '否'],
                  ['time', '7d / 30d / 90d', '否'],
                  ['q', '关键词（搜标题/正文/作者）', '否'],
                  ['sort', 'popular（默认）/ latest', '否'],
                  ['page', '页码，默认 1', '否'],
                  ['pageSize', '每页条数，默认 20，上限 50', '否'],
                ]}
                example={`{
  "data": [
    {
      "id": 30,
      "title": "横纵分析法：半小时搞懂任何陌生领域",
      "excerpt": "这是一个我自己用了两年的研究框架...",
      "tagScene": "industry-research",
      "tagSkill": "prompt",
      "viewCount": 42,
      "createdAt": "2026-06-14T...",
      "author": { "id": 9, "nickname": "lensnowovo", "role": "VC" },
      "counts": { "comments": 1, "likes": 8, "attachments": 0 },
      "skillAsset": { "id": 30, "assetType": "prompt" }
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "hasMore": false }
}`}
              />

              <Endpoint
                method="GET"
                path="/api/v1/skills/:id"
                desc="单个 Skill 详情，含完整正文、附件列表、skill 资产信息"
                params={[['id', 'Skill ID', '是']]}
                example={`{
  "data": {
    "id": 30,
    "title": "...",
    "body": "<p>完整正文 HTML...</p>",
    "skillAsset": {
      "assetType": "prompt",
      "sourceUrl": "https://github.com/...",
      "installHint": "...",
      "usageNotes": "..."
    },
    "attachments": [
      {
        "id": 5, "fileName": "xxx.md", "fileSize": 3846,
        "mimeType": "text/markdown", "downloadCount": 12,
        "downloadUrl": "/api/files/5/download"
      }
    ],
    "viewCount": 42, "counts": { "comments": 1, "likes": 8, "favorites": 3 }
  }
}`}
                note="附件返回 downloadUrl（相对路径），拼接域名即可下载。不暴露存储路径等内部字段。"
              />

              <Endpoint
                method="GET"
                path="/api/v1/skills/:id/raw"
                desc="取 Skill 原文，方便 AI / 工具直接拿干净内容"
                params={[['id', 'Skill ID', '是']]}
                example={`# prompt 帖 → 返回纯文本 (text/plain)
# 文件帖（SKILL.md 等）→ 302 重定向到文件下载
curl -L https://你的域名/api/v1/skills/14/raw`}
                note="prompt 帖返回正文纯文本（优先 <pre> 内容）；有附件的帖重定向到文件下载。"
              />

              <Endpoint
                method="GET"
                path="/api/v1/tags"
                desc="全部分类标签（场景/行业/内容/类型/身份/阶段），含 value + 中文 label"
                params={[]}
                example={`{
  "data": {
    "scenes": [{ "value": "financial", "label": "财务分析", "example": "..." }, ...],
    "skillTypes": [{ "value": "prompt", "label": "提示词", "desc": "..." }, ...],
    "stageGroups": [{ "value": "pre-deal", "label": "投前 · 发现与判断", "scenes": [...] }, ...]
  }
}`}
              />

              <Endpoint
                method="GET"
                path="/api/v1/stats"
                desc="站点统计：Skill 总数、按场景/类型的分布"
                params={[]}
                example={`{
  "data": {
    "totalSkills": 17,
    "byScene": [{ "value": "financial", "label": "财务分析", "count": 5 }, ...],
    "bySkillType": [{ "value": "agent-skill", "label": "SKILL.md", "count": 16 }, ...]
  }
}`}
              />
            </div>
          </section>

          {/* 下一步：MCP */}
          <section className="pt-6 border-t border-paper-edge">
            <SectionTitle id="mcp">接下来：MCP</SectionTitle>
            <p className="font-sans text-sm text-leather leading-relaxed">
              这套 REST API 是地基。下一步会包成 MCP server，
              让 Claude / Cursor 等 AI 工具能直接调用「搜索 PEVC skill」「下载原文」——
              AI 接入网站，不用人手动复制。
            </p>
          </section>
        </div>

        {/* —— 侧边目录 —— */}
        <aside className="hidden lg:block">
          <div className="lg:sticky lg:top-6 space-y-3 text-sm">
            <p className="font-display tracking-display text-[10px] text-sepia uppercase">目录</p>
            <nav className="space-y-1.5 font-serif text-leather">
              <a href="#quick" className="block hover:text-ink-brown">快速开始</a>
              <a href="#general" className="block hover:text-ink-brown">通用说明</a>
              <a href="#endpoints" className="block hover:text-ink-brown">端点</a>
              <a href="#mcp" className="block hover:text-ink-brown">接下来：MCP</a>
            </nav>
            <div className="pt-3 mt-3 border-t border-paper-edge">
              <Link href="/" className="font-serif italic text-xs text-sepia hover:text-ink-brown">
                ← 返回首页
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* —— 局部组件 —— */
function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="font-serif text-xl text-ink-brown mb-4">{children}</h2>;
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="font-mono text-xs bg-ink-brown text-vellum rounded-md p-4 overflow-x-auto leading-relaxed">
      {children}
    </pre>
  );
}

function Endpoint({
  method,
  path,
  desc,
  params,
  example,
  note,
}: {
  method: string;
  path: string;
  desc: string;
  params: [string, string, string][];
  example: string;
  note?: string;
}) {
  return (
    <div className="border border-paper-edge rounded-md p-5 bg-vellum/40">
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <span className="inline-flex items-center h-6 px-2 bg-wax-red text-white text-[11px] font-sans font-semibold rounded-sm">
          {method}
        </span>
        <code className="font-mono text-sm text-ink-brown break-all">{path}</code>
      </div>
      <p className="font-sans text-sm text-leather mb-4">{desc}</p>

      {params.length > 0 && (
        <div className="mb-4">
          <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-2">参数</p>
          <div className="border border-paper-edge rounded-sm overflow-hidden">
            <table className="w-full text-xs">
              <tbody>
                {params.map(([name, desc, req]) => (
                  <tr key={name} className="border-b border-paper-edge last:border-b-0">
                    <td className="font-mono text-ink-brown px-3 py-2 align-top whitespace-nowrap">{name}</td>
                    <td className="font-sans text-leather px-3 py-2">{desc}</td>
                    <td className="font-sans text-sepia px-3 py-2 text-right whitespace-nowrap">{req}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-2">示例</p>
        <pre className="font-mono text-[11px] bg-ink-brown text-vellum rounded-sm p-3 overflow-x-auto leading-relaxed">
          {example}
        </pre>
      </div>

      {note && (
        <p className="mt-3 font-sans text-xs text-sepia italic">💡 {note}</p>
      )}
    </div>
  );
}
