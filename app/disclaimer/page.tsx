import Link from 'next/link';

export const metadata = { title: '免责声明 · N.E.I.' };

export default function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <Link href="/" className="font-serif italic text-sm text-sepia hover:text-ink-brown mb-4 inline-block">← 返回首页</Link>
      <h1 className="font-serif text-3xl text-ink-brown mb-2">免责声明</h1>
      <p className="font-sans text-xs text-sepia mb-8">版本 2026-06</p>
      <div className="prose-manuscript max-w-none space-y-6 text-sm leading-7 text-leather">
        <section>
          <h2 className="font-serif text-xl text-ink-brown">内容来源</h2>
          <p>N.E.I. 上的内容可能由用户投稿、社区共创或 AI 辅助生成。每个 Skill 标注了原作者和来源。N.E.I. 对用户投稿内容进行安全扫描和质量审核，但不保证内容的绝对准确性、完整性或时效性。</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-ink-brown">不构成专业意见</h2>
          <p><strong className="text-ink-brown">N.E.I. 上的所有 Skill、Workflow、方法论和 AI 辅助输出，仅用于信息整理、方法论参考和工作流辅助。</strong></p>
          <p className="mt-2"><strong className="text-ink-brown">这些内容不构成投资建议、法律意见、财务意见、税务意见、审计意见或合规意见。</strong></p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-ink-brown">用户责任</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>用户应核查关键事实、数据来源和适用法规政策；</li>
            <li>重要事项应咨询律师、会计师、审计师、税务顾问或合规顾问；</li>
            <li>用户基于 AI 输出采取行动前，应结合自身专业判断和所在机构流程；</li>
            <li>N.E.I. 不应被视为投资决策主体或专业服务机构。</li>
          </ul>
        </section>
        <section>
          <h2 className="font-serif text-xl text-ink-brown">AI 输出局限</h2>
          <p>AI 辅助生成的内容可能存在事实错误、逻辑偏差或信息滞后。用户不应将 AI 输出作为唯一决策依据。涉及投资决策、法律判断、财务分析、合规判断或正式对外文件的场景，用户必须进行人工核查和专业复核。</p>
        </section>
        <div className="pt-6 border-t border-paper-edge flex gap-4 text-xs flex-wrap">
          <Link href="/terms" className="text-sepia hover:text-ink-brown">用户协议 →</Link>
          <Link href="/privacy" className="text-sepia hover:text-ink-brown">隐私政策 →</Link>
          <Link href="/security" className="text-sepia hover:text-ink-brown">MCP 安全 →</Link>
          <Link href="/contribution-guidelines" className="text-sepia hover:text-ink-brown">投稿规则 →</Link>
        </div>
      </div>
    </div>
  );
}
