import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '信任与使用规则 · N.E.I.',
  description: 'N.E.I. 的隐私、免责声明、内容规则和 MCP 安全边界。',
};

const SECTIONS = [
  {
    title: 'N.E.I. 不构成投资建议',
    body: [
      'N.E.I. 是 Skill、Prompt、模板和工作流的社区与方法库。平台内容用于辅助信息整理、研究框架搭建和文档起草，不构成任何投资建议、法律意见、财务意见或税务意见。',
      '用户需要自行判断输入材料、输出结果和最终投资决策的准确性、完整性与适用性。',
    ],
  },
  {
    title: '敏感项目材料由用户自己掌控',
    body: [
      '请不要把未脱敏的 BP、CIM、财务模型、投委会材料、会议录音、客户名单或其他保密信息发布为公开 Skill。',
      '在网站执行 Prompt 或使用外部 AI 客户端时，用户应遵守所在机构的信息安全、保密和合规要求。',
    ],
  },
  {
    title: 'MCP 安全边界',
    body: [
      'N.E.I. MCP Server 只返回公开且已准入的 Skill / Workflow 文本，以及你收藏库中的公开内容，不读取你的本地文件，不上传你的项目材料，也不默认保存你的项目敏感信息。',
      'MCP Token 是访问 N.E.I. MCP 服务和你个人收藏库的凭证。如果你怀疑 Token 泄露，可以在连接配置页重新生成。',
    ],
  },
  {
    title: '内容版权与转载',
    body: [
      '用户发布内容时，应确认自己拥有相应权利，或已获得授权，或该内容可以合法转载、引用或改编。',
      '转载、翻译或整理外部内容时，请尽量注明来源、原作者和原链接。N.E.I. 会优先推荐来源清晰、结构完整、可复用的内容。',
    ],
  },
  {
    title: '账号与内容删除',
    body: [
      '用户可以编辑个人资料、删除自己发布的内容，或通过站内联系方式请求删除账号与相关内容。',
      '账号删除、数据复制、内容申诉和版权下架请求可通过隐私政策与版权页面列明的渠道提出；平台会核验身份后处理。',
    ],
  },
] as const;

export default function LegalPage() {
  return (
    <div className="mx-auto max-w-prose px-4 sm:px-6 py-8">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center gap-1.5 font-serif italic text-sm text-sepia hover:text-ink-brown transition-colors">
          ← 返回首页
        </Link>
      </div>

      <header className="mb-8 pb-5 border-b border-paper-edge">
        <p className="font-display tracking-display text-[11px] text-sepia uppercase mb-1">
          Trust & Terms
        </p>
        <h1 className="font-serif text-3xl text-ink-brown">信任与使用规则</h1>
        <p className="mt-2 font-sans text-sm leading-6 text-leather">
          从账号、内容、隐私、版权到 MCP 的公开规则与处理边界。
        </p>
      </header>

      <div className="space-y-7">
        {SECTIONS.map((section) => (
          <section key={section.title} className="border-b border-paper-edge pb-6 last:border-b-0">
            <h2 className="font-serif text-xl text-ink-brown">{section.title}</h2>
            <div className="mt-3 space-y-3">
              {section.body.map((paragraph) => (
                <p key={paragraph} className="font-sans text-sm leading-7 text-leather">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-paper-edge pt-5 font-sans text-xs text-sepia">
        <Link href="/terms" className="hover:text-ink-brown">用户协议</Link>
        <Link href="/privacy" className="hover:text-ink-brown">隐私政策</Link>
        <Link href="/community-rules" className="hover:text-ink-brown">社区规则</Link>
        <Link href="/copyright" className="hover:text-ink-brown">版权与下架</Link>
        <Link href="/security" className="hover:text-ink-brown">MCP 安全</Link>
      </footer>
    </div>
  );
}
