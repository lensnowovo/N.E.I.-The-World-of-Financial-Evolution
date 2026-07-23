import Link from 'next/link';
import { LEGAL_EFFECTIVE_DATE } from '@/lib/legal';

export const metadata = { title: '社区与内容规则 · N.E.I.' };

export default function CommunityRulesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/legal" className="font-serif text-sm italic text-sepia hover:text-ink-brown">← 返回信任与规则</Link>
      <h1 className="mt-5 font-serif text-4xl text-ink-brown">社区与内容规则</h1>
      <p className="mt-2 font-sans text-xs text-sepia">生效日期 {LEGAL_EFFECTIVE_DATE}</p>
      <div className="mt-8 space-y-7 font-sans text-sm leading-7 text-leather">
        <Rule title="发布前先确认权利">仅发布原创、获授权、符合开源许可证或依法可引用的内容。转载、翻译和改编必须标注来源、原作者、原链接、许可证和版本。</Rule>
        <Rule title="项目资料先脱敏">公开投稿不得含未披露项目名称、联系方式、财务底稿、客户名单、访谈录音、投委会意见、基金 LP 信息、商业秘密或其他受保密义务约束的数据。</Rule>
        <Rule title="禁止违法与误导内容">禁止诈骗、诽谤、侵权、歧视、色情、暴力、违法金融营销、恶意代码、Prompt Injection、数据窃取指令及法律法规禁止的信息。</Rule>
        <Rule title="AI 辅助内容要可核验">使用 AI 生成或深度改写时，应在投稿中如实声明；引用的数据、结论、案例和来源仍由投稿人核验，不得虚构机构背书、收益或实务经验。</Rule>
        <Rule title="审核与处置">平台可进行机器扫描和人工审核，采取退回修改、限制展示、撤销 MCP 准入、下架、冻结账号和证据保全。用户可补充授权材料或提出申诉。</Rule>
        <Rule title="举报">发现泄密、侵权、违法内容或冒用身份，请在详情页举报。涉及正在扩散的敏感信息，请同时通过 GitHub Security 私下报告，不要在公开 Issue 复述敏感正文。</Rule>
      </div>
    </main>
  );
}

function Rule({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="font-serif text-xl text-ink-brown">{title}</h2><p className="mt-2">{children}</p></section>;
}
