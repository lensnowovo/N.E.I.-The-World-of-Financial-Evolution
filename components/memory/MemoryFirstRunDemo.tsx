export function MemoryFirstRunDemo() {
  return (
    <figure className="mt-7 overflow-hidden rounded-md border border-[#aec6bd] bg-[#102f29] shadow-[0_18px_46px_-30px_rgba(10,48,41,0.75)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3 text-vellum">
        <span className="font-display text-[9px] uppercase tracking-display text-[#8fd7bd]">
          Real Interface · First-run Walkthrough
        </span>
        <span className="font-sans text-[10px] text-vellum/55">约 40 秒 · 演示数据</span>
      </div>
      {/* The recording is generated from the current desktop preview build. The
          PREVIEW badge prevents demo data from being mistaken for live state. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/memory/memory-node-first-run.webp"
        alt="Memory Node 依次展示账号登录、实时状态、Agent 连接和本机设置"
        className="block h-auto w-full bg-[#eef1ee]"
        loading="lazy"
      />
      <figcaption className="border-t border-white/10 px-5 py-3 font-sans text-[10px] leading-5 text-vellum/55">
        画面来自当前客户端构建；账号、路径和连接状态均为明确标注的预览数据。
      </figcaption>
    </figure>
  );
}
