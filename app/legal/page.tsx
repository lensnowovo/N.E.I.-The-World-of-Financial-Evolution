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
      'N.E.I. MCP Server 只返回 Skill / Workflow 文本和你收藏库里的公开内容，不读取你的本地文件，不上传你的项目材料，也不默认保存你的项目敏感信息。',
      'MCP Token 是访问你个人收藏库的凭证。如果你怀疑 Token 泄露，可以在连接配置页重新生成。',
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
      'Beta 阶段的管理能力会保持轻量，后续会补充更完整的账号删除、数据导出和内容申诉流程。',
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
          Public Beta 阶段的轻量说明：帮助你理解 N.E.I. 的边界、责任和 MCP 使用方式。
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

      <footer className="mt-8 rounded-md border border-gilded/40 bg-gilded/5 px-4 py-4">
        <p className="font-serif text-sm text-ink-brown">上线前仍建议人工复核</p>
        <p className="mt-1 font-sans text-xs leading-5 text-leather">
          这是一版 Beta 可用的基础文本，不替代正式法律文件。正式上线、商业化或开放大规模外部贡献前，建议补充律师审阅版 Privacy Policy、Terms of Use 和内容审核规则。
        </p>
      </footer>
    </div>
  );
}
