import Link from 'next/link';
import { LEGAL_CONTACT, LEGAL_EFFECTIVE_DATE, TERMS_VERSION } from '@/lib/legal';

export const metadata = { title: '用户协议 · N.E.I.' };

const sections = [
  ['一、协议主体与生效', [
    '本协议由您与 N.E.I. 网站运营者吴其臻（N.E.I. 项目负责人及备案主体）共同订立。您完成非预勾选的协议确认并注册账号后，本协议生效。',
    '本服务面向年满 18 周岁的投资、研究及相关专业人士。未满 18 周岁者不得注册或使用投稿、评论、MCP、Memory Node 等账号功能。',
  ]],
  ['二、服务范围', [
    'N.E.I. 提供公开 Skill、Prompt、Workflow 与 MCP 信息目录的浏览、搜索、收藏、投稿和分发，并逐步提供 Memory Node 的下载与授权管理。功能可能因 Beta 测试、维护、安全或合规要求调整。',
    '网站不代替持牌金融、证券、法律、会计或税务服务。平台内容及 Agent 输出仅用于研究方法和工作辅助，不构成投资建议、收益承诺或交易指令。',
  ]],
  ['三、账号与凭证', [
    '您应提供真实、准确且有权使用的账号信息，妥善保管登录凭证、MCP Token 与 Memory Node 激活凭证。Token 泄露后应立即撤销。',
    '不得买卖、出租账号，不得冒用他人或机构身份，不得以自动化方式绕过访问控制、限流、审核、设备上限或付费限制。',
  ]],
  ['四、投稿、评论与附件', [
    '您只能发布原创、获得合法授权、符合开源许可证或依法可使用的内容，并应如实填写来源、作者、许可证和版本信息。不得上传未脱敏的 BP、财务模型、投委会材料、会议录音、客户名单、商业秘密或其他受保密义务约束的资料。',
    '您保留对原创内容的权利，并授予 N.E.I. 在提供、展示、审核、检索、缓存和通过 MCP 分发该内容所必要的非独占、可撤回许可。删除或下架不影响删除前已合法完成的使用及依法需要保留的记录。',
    '平台可对内容进行机器扫描和人工审核，并基于违法违规、侵权、泄密、安全风险、低质量或许可证不清等原因拒绝发布、限制 MCP 分发、下架或保全证据。',
  ]],
  ['五、AI 与 MCP 使用边界', [
    'AI 转写、内容辅助和安全扫描仅在相应页面明确提示的范围内使用。提交前请完成脱敏；不得要求平台或第三方模型处理您无权提供的数据。',
    'N.E.I. MCP 只分发 Skill / Workflow 文本。项目名称、文档、财务数据、访谈记录等上下文应仅在您信任的本地或已登录 Agent 客户端中填入，不应作为 MCP 工具参数发送至 N.E.I.。',
    '外部 MCP、API 和数据源由各自提供者运营。接入前应核对其条款、权限、数据流向、费用和许可证，N.E.I. 的目录收录不代表安全背书。',
  ]],
  ['六、禁止行为', [
    '不得发布法律法规禁止的信息，不得实施诈骗、侵权、诽谤、恶意营销、数据窃取、Prompt Injection、恶意代码传播、未授权爬取或攻击服务。',
    '不得利用本服务从事未经许可的证券投资咨询、荐股、代客理财或其他需要行政许可的经营活动，不得虚构业绩、案例、身份、机构背书或收益。',
  ]],
  ['七、处置、申诉与终止', [
    '为保护用户、权利人及平台安全，N.E.I. 可采取提醒、限流、暂停发布、撤销 MCP 准入、下架内容、冻结或终止账号等措施。紧急风险可先处置后通知。',
    '您可就内容或账号处置提出说明、补充授权材料或申诉。平台将根据风险、证据和法律要求复核。',
  ]],
  ['八、责任边界', [
    'Skill、Prompt、数据源和 Agent 输出可能存在错误、遗漏、过时或不适用。您应独立核验事实、数据、来源和模型结论，并对最终决策负责。',
    '在法律允许范围内，因第三方服务中断、用户自行配置、外部链接、未经授权上传或违反机构制度造成的损失，由责任方依法承担。',
  ]],
  ['九、协议更新与联系', [
    '重大变更将通过页面提示、站内通知或重新确认的方式告知；涉及处理目的、数据种类或单独同意事项变化的，将依法重新取得同意。',
    `本版本号为 ${TERMS_VERSION}，生效日期为 ${LEGAL_EFFECTIVE_DATE}。如需投诉、申诉或法律联系，请使用本页所列渠道。`,
  ]],
] as const;

export default function TermsPage() {
  return <LegalDocument title="用户协议" eyebrow="Terms of Use" sections={sections} />;
}

function LegalDocument({ title, eyebrow, sections }: { title: string; eyebrow: string; sections: readonly (readonly [string, readonly string[]])[] }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/legal" className="mb-5 inline-block font-serif text-sm italic text-sepia hover:text-ink-brown">← 返回信任与规则</Link>
      <header className="mb-8 border-b border-paper-edge pb-5">
        <p className="font-display text-[10px] uppercase tracking-[0.2em] text-gilded">{eyebrow}</p>
        <h1 className="mt-2 font-serif text-4xl text-ink-brown">{title}</h1>
        <p className="mt-2 font-sans text-xs text-sepia">版本 {TERMS_VERSION} · 生效日期 {LEGAL_EFFECTIVE_DATE}</p>
      </header>
      <div className="space-y-7">
        {sections.map(([heading, paragraphs]) => (
          <section key={heading}>
            <h2 className="font-serif text-xl text-ink-brown">{heading}</h2>
            <div className="mt-3 space-y-3 font-sans text-sm leading-7 text-leather">
              {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </section>
        ))}
      </div>
      <ContactBlock />
    </main>
  );
}

function ContactBlock() {
  return (
    <aside className="mt-10 border-t border-paper-edge pt-5 font-sans text-sm leading-6 text-leather">
      <p className="font-serif text-base text-ink-brown">联系与投诉</p>
      {LEGAL_CONTACT.email && <p className="mt-2">邮箱：<a className="underline" href={`mailto:${LEGAL_CONTACT.email}`}>{LEGAL_CONTACT.email}</a></p>}
      <p className="mt-1">安全问题：<a className="underline" href={LEGAL_CONTACT.github} target="_blank" rel="noreferrer">GitHub Security</a></p>
    </aside>
  );
}
