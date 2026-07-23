import Link from 'next/link';

export const metadata = { title: '投稿与内容授权 · N.E.I.' };

export default function ContributionGuidelinesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <Link href="/" className="font-serif italic text-sm text-sepia hover:text-ink-brown mb-4 inline-block">← 返回首页</Link>
      <h1 className="font-serif text-3xl text-ink-brown mb-2">投稿与内容授权</h1>
      <p className="font-sans text-xs text-sepia mb-8">版本 2026-07-22</p>
      <div className="prose-manuscript max-w-none space-y-6 text-sm leading-7 text-leather">
        <section>
          <h2 className="font-serif text-xl text-ink-brown">一、投稿内容要求</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>内容应来自您有权分享的经验、方法论、模板或公开信息；</li>
            <li><strong className="text-ink-brown">不得包含未经授权的保密信息、第三方机密材料或未披露项目敏感信息；</strong></li>
            <li>不得包含恶意指令、Prompt Injection、诱导 AI 读取本地文件或外发数据的内容；</li>
            <li>不得侵犯他人版权或知识产权。</li>
          </ul>
        </section>
        <section>
          <h2 className="font-serif text-xl text-ink-brown">二、内容授权</h2>
          <p>投稿者保留原创内容权利，并授予 N.E.I. 为审核、展示、检索、缓存和通过 MCP 分发该内容所必要的非独占许可。转载、翻译或改编内容必须填写原作者、来源链接、许可证和版本。</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-ink-brown">三、审核流程</h2>
          <p>普通用户投稿统一进入人工待审。机器扫描只提供审核线索；扫描失败、可疑或拒绝均不会自动公开。Web 发布与 MCP 准入是两个独立步骤，编辑已发布内容后会重新进入审核并撤销原 MCP 准入。</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-ink-brown">四、内容管理</h2>
          <p>N.E.I. 有权审核、拒绝、下架、修改展示状态或取消 MCP 分发。低质量内容、侵权内容或高风险内容可能被退回或删除。如投稿者误上传敏感信息，请尽快通过举报功能或 GitHub 联系平台处理。</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-ink-brown">五、质量建议</h2>
          <p>高质量投稿应包含：清晰的方法论框架（≥4 步）、明确的输入要求（占位符）、预期的输出格式、红旗/风险识别、来源标注。N.E.I. 对投稿进行质量评分，高分内容可入选精选展示。</p>
        </section>
        <div className="pt-6 border-t border-paper-edge flex gap-4 text-xs flex-wrap">
          <Link href="/terms" className="text-sepia hover:text-ink-brown">用户协议 →</Link>
          <Link href="/privacy" className="text-sepia hover:text-ink-brown">隐私政策 →</Link>
          <Link href="/security" className="text-sepia hover:text-ink-brown">MCP 安全 →</Link>
          <Link href="/disclaimer" className="text-sepia hover:text-ink-brown">免责声明 →</Link>
          <Link href="/community-rules" className="text-sepia hover:text-ink-brown">社区规则 →</Link>
          <Link href="/copyright" className="text-sepia hover:text-ink-brown">版权与下架 →</Link>
        </div>
      </div>
    </div>
  );
}
