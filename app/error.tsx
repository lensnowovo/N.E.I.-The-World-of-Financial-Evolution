'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Ornament } from '@/components/icons/Ornament';

/**
 * 全局 500 · 墨迹突然中断
 * Next.js error boundary，必须 'use client'
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 生产可接 Sentry 等
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-prose pt-section text-center">
      <p className="font-display tracking-display text-[11px] text-sepia uppercase mb-4">
        Ink Interrupted · D
      </p>
      <h1 className="font-serif text-6xl text-ink-brown num-osf mb-6">500</h1>

      <div className="flex justify-center mb-6 text-leather">
        <InkSpillIcon />
      </div>

      <p className="font-serif italic text-lg text-leather mb-2">
        出了点问题
      </p>
      <p className="font-sans text-sm text-sepia mb-2 max-w-md mx-auto leading-relaxed">
        服务端发生了异常。你可以重试，或返回首页稍后再试。
      </p>
      {error.digest && (
        <p className="font-sans text-[10px] text-sepia/70 mb-6 num-osf">
          编号 · {error.digest}
        </p>
      )}

      <div className="flex justify-center mb-7 text-leather">
        <Ornament width={64} />
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center h-10 px-5 bg-ink-brown text-vellum hover:bg-wax-red font-serif text-sm rounded-sm transition-colors"
        >
          重试
        </button>
        <Link
          href="/"
          className="inline-flex items-center h-10 px-5 border border-ink-brown text-ink-brown hover:bg-ink-brown hover:text-vellum font-serif text-sm rounded-sm transition-colors"
        >
          回到首页
        </Link>
      </div>
    </div>
  );
}

/** 墨迹溅出 —— 一滴墨化开 */
function InkSpillIcon() {
  return (
    <svg width="100" height="80" viewBox="0 0 100 80" fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" aria-hidden="true">
      {/* 折断的羽毛笔 */}
      <path d="M14 22 L42 50" strokeLinecap="round" />
      <path d="M42 50 L36 56 L34 52 L40 46 Z" fill="currentColor" />
      {/* 中间断点 */}
      <path d="M28 32 L32 36 M30 28 L34 32" opacity="0.4" />
      {/* 墨滴主体 */}
      <ellipse cx="60" cy="58" rx="14" ry="10" />
      {/* 墨溅 */}
      <circle cx="80" cy="46" r="1.6" fill="currentColor" />
      <circle cx="86" cy="56" r="1" fill="currentColor" />
      <circle cx="74" cy="38" r="0.8" fill="currentColor" />
      <circle cx="46" cy="68" r="1.2" fill="currentColor" />
    </svg>
  );
}
