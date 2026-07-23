import Link from 'next/link';
import { LEGAL_CONTACT, LEGAL_EFFECTIVE_DATE } from '@/lib/legal';

export const metadata = { title: '版权与下架流程 · N.E.I.' };

export default function CopyrightPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/legal" className="font-serif text-sm italic text-sepia hover:text-ink-brown">← 返回信任与规则</Link>
      <h1 className="mt-5 font-serif text-4xl text-ink-brown">版权与下架流程</h1>
      <p className="mt-2 font-sans text-xs text-sepia">生效日期 {LEGAL_EFFECTIVE_DATE}</p>
      <div className="mt-8 space-y-7 font-sans text-sm leading-7 text-leather">
        <section><h2 className="font-serif text-xl text-ink-brown">提交权利通知</h2><p className="mt-2">请提供权利人身份和联系方式、被投诉内容 URL、权利证明、具体侵权说明及真实性声明。涉及商业秘密时，请勿通过公开 Issue 提交正文。</p></section>
        <section><h2 className="font-serif text-xl text-ink-brown">临时处置与核验</h2><p className="mt-2">对材料完整或存在紧急风险的通知，平台可先暂停展示和 MCP 分发，再联系投稿人补充授权材料。明显不完整的通知会被要求补正。</p></section>
        <section><h2 className="font-serif text-xl text-ink-brown">投稿人申诉</h2><p className="mt-2">投稿人可提交原创证据、授权书、许可证、版本记录或合法使用说明。平台将结合双方材料决定恢复、修改来源、继续下架或移交进一步处理。</p></section>
        <section><h2 className="font-serif text-xl text-ink-brown">联系渠道</h2>{LEGAL_CONTACT.email && <p className="mt-2">邮箱：<a className="underline" href={`mailto:${LEGAL_CONTACT.email}`}>{LEGAL_CONTACT.email}</a></p>}<p className="mt-1">安全和非公开材料：<a className="underline" href={LEGAL_CONTACT.github} target="_blank" rel="noreferrer">GitHub Security</a></p></section>
      </div>
    </main>
  );
}
