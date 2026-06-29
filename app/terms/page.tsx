import Link from 'next/link';

export const metadata = { title: '用户协议 · N.E.I.' };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <Link href="/" className="font-serif italic text-sm text-sepia hover:text-ink-brown mb-4 inline-block">← 返回首页</Link>
      <h1 className="font-serif text-3xl text-ink-brown mb-2">用户协议</h1>
      <p className="font-sans text-xs text-sepia mb-8">版本 2026-06 · 最后更新：2026 年 6 月</p>
      <div className="prose-manuscript max-w-none space-y-6 text-sm leading-7 text-leather">
        <section>
          <h2 className="font-serif text-xl text-ink-brown">一、服务内容</h2>
          <p>N.E.I.（nei-pevc.com）是一个面向一级市场从业者的 PEVC AI Skill Hub。平台提供以下服务：浏览和搜索 Skill / Workflow / 方法论；收藏、评论、投稿；通过 MCP 协议将收藏的 Skill 分发给用户的 Agent 客户端（如 Claude Code、Codex、Workbuddy 或其它支持 MCP 的 Agent 客户端）。</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-ink-brown">二、账号责任</h2>
          <p>用户应妥善保管账号凭证和 MCP Token。<strong className="text-ink-brown">MCP Token 等同于您的平台访问凭证，泄露后请立即重置。</strong>用户对其账号下的所有活动负责，包括投稿内容、评论、MCP 调用等。</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-ink-brown">三、内容规范</h2>
          <p>用户不得上传以下内容：</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>违法、侵权、欺诈或误导性内容；</li>
            <li><strong className="text-ink-brown">未经授权的机构保密材料、第三方机密文件、未披露项目敏感信息；</strong></li>
            <li>恶意指令、Prompt Injection、诱导 AI 读取本地文件或外发数据的内容；</li>
            <li>违反国家法律法规的内容。</li>
          </ul>
        </section>
        <section>
          <h2 className="font-serif text-xl text-ink-brown">四、审核与展示</h2>
          <p>N.E.I. 有权基于安全、合规、内容质量和社区规则，对投稿内容进行审核、调整展示状态、下架或拒绝 MCP 分发。投稿内容在通过安全扫描和管理员审核后，才会进入 MCP 可调用列表。</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-ink-brown">五、服务性质</h2>
          <p>N.E.I. 提供 Skill、Workflow、方法论和信息整理辅助工具。平台内容可能由用户、社区或 AI 辅助生成。<strong className="text-ink-brown">所有内容不构成投资建议、法律意见、财务意见、税务意见、审计意见或合规意见。</strong>用户应自行判断投资、法律、财务和合规后果，并结合自身专业判断和所在机构流程使用。</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-ink-brown">六、协议调整</h2>
          <p>N.E.I. 可能根据业务发展和法规要求调整本协议。重大变更将在平台公告，继续使用即视为接受变更。</p>
        </section>
        <div className="pt-6 border-t border-paper-edge flex gap-4 text-xs">
          <Link href="/privacy" className="text-sepia hover:text-ink-brown">隐私政策 →</Link>
          <Link href="/security" className="text-sepia hover:text-ink-brown">MCP 安全 →</Link>
          <Link href="/disclaimer" className="text-sepia hover:text-ink-brown">免责声明 →</Link>
          <Link href="/contribution-guidelines" className="text-sepia hover:text-ink-brown">投稿规则 →</Link>
        </div>
      </div>
    </div>
  );
}
