import Link from 'next/link';

const ITEMS = [
  '不读取本地文件',
  '不保存项目材料',
  'Token 可随时撤销',
  'Skill 审核后进入 MCP',
  '外部 MCP 需用户确认',
];

export function HomeTrustFeature() {
  return (
    <section className="my-6 rounded-md border border-paper-edge bg-vellum/60 px-5 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-1">
            Trust & Safety
          </p>
          <h2 className="font-serif text-xl text-ink-brown">安全连接你的 AI 客户端</h2>
          <p className="mt-1 font-sans text-xs text-leather leading-relaxed">
            N.E.I. MCP 只分发 Skill / Workflow，不接管你的 BP、财务模型和投委会材料。
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ITEMS.map((item) => (
            <span key={item} className="rounded-full border border-paper-edge bg-parchment px-2.5 py-1 font-sans text-[11px] text-leather">
              {item}
            </span>
          ))}
        </div>
        <Link href="/security" className="shrink-0 font-serif italic text-sm text-wax-red hover:underline">
          MCP 安全与保密原则 →
        </Link>
      </div>
    </section>
  );
}
