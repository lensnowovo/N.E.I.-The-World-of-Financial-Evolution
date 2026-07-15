export const dynamic = 'force-dynamic';

import Link from 'next/link';

export const metadata = {
  title: 'MCP 安全与保密原则 · N.E.I.',
  description: 'N.E.I. MCP 的安全边界、数据承诺、Token 管理、Skill 审核机制与举报渠道',
};

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-page px-4 sm:px-6 py-8">
      <div className="mb-6 pb-5 border-b border-paper-edge">
        <Link href="/" className="inline-flex items-center gap-1.5 font-serif italic text-sm text-sepia hover:text-ink-brown mb-3">
          ← 返回首页
        </Link>
        <h1 className="font-serif text-3xl text-ink-brown mb-1">MCP 安全与保密原则</h1>
        <p className="font-sans text-sm text-sepia">
          给 PEVC 机构用户看的边界说明：N.E.I. 分发 Skill，不接管你的项目材料。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        <div className="prose-manuscript max-w-none">
          <h2>N.E.I. MCP 默认不做什么？</h2>
          <div className="not-prose grid grid-cols-1 sm:grid-cols-2 gap-4 my-5">
            <PrincipleCard
              title="不会读取本地文件"
              body="N.E.I. MCP 不具备读取你电脑、项目目录、邮箱、网盘或本地数据库的权限。"
            />
            <PrincipleCard
              title="不会上传项目材料"
              body="不会上传 BP、财务模型、投委会材料、LP 名单、访谈纪要或客户资料。"
            />
            <PrincipleCard
              title="不会保存执行结果"
              body="AI 执行发生在你的客户端侧；N.E.I. 不保存你用 Skill 处理后的正文和结论。"
            />
            <PrincipleCard
              title="不会替你调用外部 MCP"
              body="外部 MCP、联网查询、本地文件工具都由你的客户端和你本人确认。"
            />
          </div>

          <h2>N.E.I. MCP 做什么？</h2>
          <p>
            它只把 N.E.I. 上已公开、已审核、已准入 MCP 的 Skill / Workflow 作为文本返回给你的 AI 客户端。
            可用工具包括 <code>search_skills</code>、<code>get_skill</code>、<code>list_my_skills</code>、
            <code>apply_skill</code> 和 <code>favorite_skill</code>。
          </p>
          <p>
            平台会记录调用时间、工具名、客户端类型、耗时等运维日志，但不记录你的 BP、财务模型、
            投委会材料正文，也不记录客户端执行后的敏感结论。
          </p>

          <h2>Token 管理</h2>
          <ul>
            <li>Token 以 <code>nei_</code> 开头，只在生成时显示一次；平台只保存 hash，不保存明文。</li>
            <li>建议每个 Agent 客户端使用独立 Token，并在 <Link href="/connect" className="text-wax-red">连接配置页</Link> 单独命名、查看状态或撤销。</li>
            <li>不要把 Token 发给陌生网页、群聊、截图、共享文档或不可信 Agent。</li>
            <li>如某个 Token 泄露，只需撤销对应连接，不影响其他客户端。</li>
          </ul>

          <h2>Skill 准入 MCP 的规则</h2>
          <ol>
            <li>用户投稿会先经过基础校验和安全扫描。</li>
            <li>可疑内容会进入管理员待审队列，不直接进入 MCP。</li>
            <li>只有 <code>mcpApproved = true</code> 的内容才会被 MCP 返回。</li>
            <li>已准入内容被作者编辑后，会撤回 MCP 准入并等待复审，防止 Rug Pull。</li>
          </ol>

          <h2>外部 MCP 风险提示</h2>
          <p>
            你的 AI 客户端可能还连接了文件系统、浏览器、企业知识库或其他第三方 MCP。
            这些服务有各自的权限和日志策略，N.E.I. 无法替你审查。机构用户建议只在可信、隔离、
            无敏感材料的环境里测试陌生 MCP。
          </p>

          <h2>如何举报可疑 Skill？</h2>
          <p>
            如果你看到诱导读取本地文件、泄露 Token、上传项目材料、绕过系统指令或明显违规的 Skill，
            请在详情页点击「举报」。管理员会在运营台处理，并可下架内容或撤回 MCP 准入。
          </p>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start space-y-4">
          <div className="border border-paper-edge bg-vellum rounded-md p-4">
            <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-2">快速操作</p>
            <Link href="/connect" className="block font-serif text-sm text-wax-red hover:underline mb-2">
              → 生成 / 撤销 Token
            </Link>
            <Link href="/mcp" className="block font-serif text-sm text-leather hover:text-ink-brown mb-2">
              → MCP 配置指南
            </Link>
            <Link href="/" className="block font-serif text-sm text-leather hover:text-ink-brown">
              → 浏览 Skill
            </Link>
          </div>

          <div className="border border-wax-red/30 bg-wax-red/5 rounded-md p-4">
            <p className="font-display tracking-display text-[10px] text-wax-red uppercase mb-2">三句话原则</p>
            <p className="font-sans text-xs text-leather leading-relaxed">
              N.E.I. 不读取本地文件。
              <br />
              N.E.I. 不保存项目材料。
              <br />
              Token 泄露后立即撤销对应连接。
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PrincipleCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-paper-edge bg-vellum/60 rounded-md p-4">
      <p className="font-serif text-base text-ink-brown mb-1">{title}</p>
      <p className="font-sans text-xs text-leather leading-relaxed">{body}</p>
    </div>
  );
}
