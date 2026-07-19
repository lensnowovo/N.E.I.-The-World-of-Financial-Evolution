import Link from 'next/link';

export function HomeRequestFeature() {
  return (
    <section className="mt-8 overflow-hidden rounded-xl border border-paper-edge bg-vellum/65 px-5 py-5 sm:flex sm:items-center sm:justify-between sm:px-7">
      <div>
        <p className="font-display text-[9px] uppercase tracking-[0.2em] text-gilded">Open Request Board</p>
        <h2 className="mt-1 font-serif text-xl font-normal text-ink-brown">没找到你想要的 Skill？</h2>
        <p className="mt-1 font-sans text-xs leading-6 text-leather">
          留下一个真实工作需求，也可以认领别人正在等待的方法。
        </p>
      </div>
      <div className="mt-4 flex gap-2 sm:mt-0">
        <Link href="/requests" className="rounded-md bg-ink-brown px-4 py-2.5 font-serif text-sm text-vellum hover:bg-wax-red">
          查看需求与解法 →
        </Link>
        <Link href="/requests?publish=1" className="rounded-md border border-ink-brown px-4 py-2.5 font-serif text-sm text-ink-brown hover:bg-linen">
          发布需求
        </Link>
      </div>
    </section>
  );
}
