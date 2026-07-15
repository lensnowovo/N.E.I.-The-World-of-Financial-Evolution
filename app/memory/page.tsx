import type { Metadata } from 'next';
import Link from 'next/link';
import { getSessionUid } from '@/lib/session';
import { MemoryAtmosphere } from '@/components/memory/MemoryAtmosphere';

export const metadata: Metadata = {
  title: 'N.E.I. Memory Node｜跨项目、跨客户端的本地投资记忆',
  description:
    '让 Codex、WorkBuddy 等 Agent 在不同任务间延续项目背景、判断和下一步。记忆保存在你的电脑上。',
  alternates: { canonical: '/memory' },
  openGraph: {
    title: 'N.E.I. Memory Node',
    description: '跨项目、跨客户端的本地投资记忆。Windows 内部测试版开发中。',
    url: '/memory',
    type: 'website',
    siteName: 'N.E.I.',
    images: [{ url: '/share-cover.png', width: 1200, height: 630, alt: 'N.E.I. Memory Node' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'N.E.I. Memory Node',
    description: '跨项目、跨客户端的本地投资记忆。记忆保存在你的电脑上。',
    images: ['/share-cover.png'],
  },
};

const flow = [
  ['01', '绑定范围', '明确选择机构、基金与当前项目'],
  ['02', '读取上下文', 'Agent 只获得当前任务需要的分层记忆'],
  ['03', '确认写入', 'Agent 提议，人决定保留、修改或拒绝'],
  ['04', '交接任务', 'Codex 做完，WorkBuddy 可以继续'],
] as const;

const boundaries = ['不保存原始文件', '不监听完整聊天', '不上传项目记忆', '不远程删除本地数据'] as const;

export default async function MemoryPage() {
  const signedIn = (await getSessionUid()) !== null;

  return (
    <div className="mx-auto max-w-page px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <MemoryAtmosphere className="rounded-lg border border-[#315d5b]/60 text-vellum shadow-[0_20px_60px_-35px_rgba(4,38,40,0.8)]">
        <div className="grid lg:grid-cols-[1.45fr_0.55fr]">
          <div className="relative px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border border-gilded/20" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-6 -top-10 h-44 w-44 rounded-full border border-gilded/15" />

            <div className="relative">
              <div className="mb-7 flex flex-wrap items-center gap-3">
                <span className="font-display text-[10px] uppercase tracking-display text-gilded">Local Memory Infrastructure</span>
                <span className="h-px w-10 bg-gilded/45" />
                <span className="font-mono text-[10px] text-vellum/55">PRIVATE PREVIEW · WINDOWS</span>
              </div>

              <h1 className="max-w-4xl font-serif text-4xl leading-[1.14] text-vellum sm:text-5xl lg:text-6xl">
                让你的 Agent，
                <span className="block text-gilded">记得做过的投资工作。</span>
              </h1>
              <p className="mt-7 max-w-2xl font-sans text-sm leading-7 text-vellum/72 sm:text-base sm:leading-8">
                N.E.I. Memory Node 在你的电脑上保存长期投资记忆。项目背景、判断变化、待验证问题和下一步，
                可以在 Codex、WorkBuddy 及其他 Agent 客户端之间继续使用。
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                {signedIn ? (
                  <span className="inline-flex min-h-11 items-center rounded-sm bg-gilded px-5 font-serif text-sm text-ink-brown">
                    已登录 · 内测登记即将开放
                  </span>
                ) : (
                  <Link
                    href="/login?next=/memory"
                    className="inline-flex min-h-11 items-center rounded-sm bg-gilded px-5 font-serif text-sm text-ink-brown transition-colors hover:bg-vellum"
                  >
                    登录后申请内部测试 →
                  </Link>
                )}
                <a
                  href="#how-it-works"
                  className="inline-flex min-h-11 items-center rounded-sm border border-vellum/25 px-5 font-serif text-sm text-vellum/80 transition-colors hover:border-gilded hover:text-gilded"
                >
                  看它如何工作
                </a>
              </div>
            </div>
          </div>

          <aside className="border-t border-[#8adacc]/15 bg-[#041111]/42 px-6 py-8 backdrop-blur-[2px] sm:px-10 lg:border-l lg:border-t-0 lg:px-7 lg:py-10">
            <p className="font-display text-[10px] uppercase tracking-display text-[#77d7c7]">Node Status</p>
            <div className="mt-5 flex items-center gap-3 border-y border-[#8adacc]/15 py-5">
              <span className="relative flex h-3 w-3" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#65d9c4] opacity-30" />
                <span className="relative inline-flex h-3 w-3 rounded-full border border-[#7ee8d5] bg-[#0a2727]" />
              </span>
              <div>
                <p className="font-serif text-lg text-vellum">内部版本开发中</p>
                <p className="mt-0.5 font-mono text-[10px] text-vellum/45">DOWNLOAD NOT YET AVAILABLE</p>
              </div>
            </div>

            <dl className="mt-6 space-y-4 font-sans text-xs">
              <StatusRow label="首发系统" value="Windows" />
              <StatusRow label="首批客户端" value="Codex / WorkBuddy" />
              <StatusRow label="存储位置" value="用户本机" />
              <StatusRow label="云端记忆" value="无" />
            </dl>

            <p className="mt-8 border-l border-[#77d7c7]/55 pl-3 font-serif text-xs leading-6 text-vellum/60">
              登录和后续订阅通过 nei-pevc.com 管理；机构、基金、项目与记忆正文不会进入网站数据库。
            </p>
          </aside>
        </div>
      </MemoryAtmosphere>

      <section id="how-it-works" className="scroll-mt-24 border-x border-b border-paper-edge bg-vellum">
        <div className="grid border-b border-paper-edge md:grid-cols-[0.72fr_1.28fr]">
          <div className="border-b border-paper-edge p-6 sm:p-8 md:border-b-0 md:border-r">
            <p className="font-display text-[10px] uppercase tracking-display text-sepia">Agent-native Software</p>
            <h2 className="mt-3 font-serif text-3xl leading-tight text-ink-brown">
              使用者是 Agent，
              <span className="block italic text-wax-red">控制权属于人。</span>
            </h2>
          </div>
          <div className="p-6 sm:p-8">
            <p className="max-w-3xl font-sans text-sm leading-7 text-leather">
              Memory Node 像 VPN 客户端一样常驻后台。你继续在熟悉的 Agent 里工作；读取、提议、确认、修改和交接都发生在当前对话中。
              本地界面只负责连接、授权、备份和诊断。
            </p>
          </div>
        </div>

        <ol className="grid sm:grid-cols-2 xl:grid-cols-4">
          {flow.map(([number, title, detail], index) => (
            <li
              key={number}
              className={`min-h-48 p-6 sm:p-7 ${index > 0 ? 'border-t border-paper-edge sm:border-l sm:border-t-0' : ''} ${index === 2 ? 'sm:border-l-0 xl:border-l' : ''}`}
            >
              <span className="font-mono text-xs text-gilded">{number}</span>
              <h3 className="mt-8 font-serif text-xl text-ink-brown">{title}</h3>
              <p className="mt-2 font-sans text-xs leading-6 text-sepia">{detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-lg border border-[#cbd8d3] bg-[#f2f6f3] p-6 shadow-[0_12px_36px_-30px_rgba(16,69,67,0.7)] sm:p-9">
          <p className="font-display text-[10px] uppercase tracking-display text-sepia">Scoped Memory</p>
          <h2 className="mt-2 font-serif text-3xl text-ink-brown">记忆有边界，也会沉淀。</h2>
          <p className="mt-3 max-w-2xl font-sans text-sm leading-7 text-leather">
            当前项目可以继承机构共识和基金经验，但不能直接读取其他项目。项目中反复验证的经验，经你确认后才能提升到基金或机构层。
          </p>

          <div className="mt-7 space-y-2 font-serif">
            <ScopeBand label="机构 / 管理人" detail="共同口径、通用方法、合规边界" tone="dark" />
            <div className="ml-4 sm:ml-8">
              <ScopeBand label="基金" detail="投资策略、限制条件、历史经验" tone="mid" />
            </div>
            <div className="ml-8 sm:ml-16">
              <ScopeBand label="当前项目" detail="事实、判断、决策、待验证问题" tone="light" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#bfd2cb] bg-[#eaf2ef] p-6 shadow-[0_12px_36px_-30px_rgba(16,69,67,0.7)] sm:p-9">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-display text-[10px] uppercase tracking-display text-sepia">Local-first Promise</p>
              <h2 className="mt-2 font-serif text-3xl text-ink-brown">你的数据，留在你的电脑。</h2>
            </div>
            <span className="shrink-0 rounded-full border border-moss/35 bg-moss/5 px-2.5 py-1 font-mono text-[10px] text-moss">LOCAL</span>
          </div>

          <ul className="mt-7 divide-y divide-paper-edge border-y border-paper-edge">
            {boundaries.map((item) => (
              <li key={item} className="flex items-center gap-3 py-3.5 font-sans text-sm text-leather">
                <span className="font-mono text-xs text-moss" aria-hidden="true">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-5 font-serif text-xs leading-6 text-sepia">
            订阅控制服务权限，不控制你对本地数据的所有权。即使订阅结束，查看、导出和删除仍应可用。
          </p>
        </div>
      </section>

      <section className="mt-12 rounded-lg border border-[#cbd8d3] bg-[#f3f6f3] shadow-[0_12px_36px_-32px_rgba(16,69,67,0.7)]">
        <div className="border-b border-paper-edge px-6 py-5 sm:px-8">
          <p className="font-display text-[10px] uppercase tracking-display text-sepia">Two MCP Connections</p>
          <h2 className="mt-1 font-serif text-2xl text-ink-brown">两种连接，各自负责一件事。</h2>
        </div>
        <div className="grid md:grid-cols-2">
          <div className="p-6 sm:p-8 md:border-r md:border-paper-edge">
            <p className="font-mono text-[10px] text-gilded">CLOUD · FREE</p>
            <h3 className="mt-2 font-serif text-xl text-ink-brown">N.E.I. Skill MCP</h3>
            <p className="mt-2 font-sans text-sm leading-7 text-leather">
              搜索和读取公开 Skill、Workflow 与连接器目录。它分发方法，不保存你的项目工作。
            </p>
            <Link href="/connect" className="mt-5 inline-flex font-serif text-sm italic text-wax-red hover:underline">
              配置 Skill MCP →
            </Link>
          </div>
          <div className="border-t border-paper-edge p-6 sm:p-8 md:border-t-0">
            <p className="font-mono text-[10px] text-moss">LOCAL · PRIVATE PREVIEW</p>
            <h3 className="mt-2 font-serif text-xl text-ink-brown">N.E.I. Memory Node MCP</h3>
            <p className="mt-2 font-sans text-sm leading-7 text-leather">
              保存并调用个人、机构、基金和项目记忆。服务运行在本机，首版面向 Windows 内部测试。
            </p>
            <span className="mt-5 inline-flex font-serif text-sm italic text-sepia">内测登记即将开放</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-vellum/45">{label}</dt>
      <dd className="text-right text-vellum/80">{value}</dd>
    </div>
  );
}

function ScopeBand({ label, detail, tone }: { label: string; detail: string; tone: 'dark' | 'mid' | 'light' }) {
  const toneClass = {
    dark: 'border-ink-brown bg-ink-brown text-vellum',
    mid: 'border-leather bg-leather text-vellum',
    light: 'border-gilded/50 bg-parchment text-ink-brown',
  }[tone];

  return (
    <div className={`flex flex-col gap-1 rounded-sm border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${toneClass}`}>
      <span className="text-sm">{label}</span>
      <span className={`font-sans text-[11px] ${tone === 'light' ? 'text-sepia' : 'text-vellum/55'}`}>{detail}</span>
    </div>
  );
}
