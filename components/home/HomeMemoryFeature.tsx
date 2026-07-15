import Link from 'next/link';
import { MemoryAtmosphere } from '@/components/memory/MemoryAtmosphere';

export function HomeMemoryFeature() {
  return (
    <MemoryAtmosphere variant="compact" className="my-8 rounded-lg border border-[#315d5b]/55 text-vellum shadow-[0_18px_50px_-34px_rgba(4,38,40,0.85)]">
      <div className="grid lg:grid-cols-[0.76fr_1.24fr]">
        <div className="relative border-b border-[#8adacc]/15 bg-[#041111]/32 px-6 py-7 text-vellum backdrop-blur-[2px] sm:px-8 lg:border-b-0 lg:border-r">
          <span className="font-display text-[10px] uppercase tracking-display text-[#77d7c7]">Next from N.E.I.</span>
          <h2 className="mt-3 font-serif text-2xl leading-tight sm:text-3xl">
            Memory Node
            <span className="mt-1 block text-lg italic text-[#9ce3d8]">本地投资记忆</span>
          </h2>
          <div className="mt-8 flex items-center gap-2 font-mono text-[10px] text-vellum/55">
            <span className="h-2 w-2 rounded-full border border-gilded" aria-hidden="true" />
            WINDOWS INTERNAL PREVIEW
          </div>
        </div>

        <div className="flex flex-col justify-between gap-7 bg-[#071516]/30 px-6 py-7 backdrop-blur-[1px] sm:px-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="font-serif text-xl leading-8 text-vellum sm:text-2xl">
              让 Codex 做完的工作，WorkBuddy 可以接着做。
            </p>
            <p className="mt-3 font-sans text-sm leading-7 text-vellum/65">
              跨项目、跨客户端的长期投资记忆。机构共识、基金经验和项目判断分层保存，数据留在你的电脑上。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {['本地 SQLite', '显式项目绑定', 'Agent 内确认', '不上传记忆'].map((item) => (
                <span key={item} className="rounded-full border border-[#8adacc]/20 bg-[#bceee5]/[0.06] px-2.5 py-1 font-sans text-[10px] text-[#b5d9d2]">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <Link
            href="/memory"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-sm border border-[#92d9cc]/45 px-5 font-serif text-sm text-[#c8eee7] transition-colors hover:border-[#9ce3d8] hover:bg-[#9ce3d8] hover:text-[#071414]"
          >
            了解 Memory Node →
          </Link>
        </div>
      </div>
    </MemoryAtmosphere>
  );
}
