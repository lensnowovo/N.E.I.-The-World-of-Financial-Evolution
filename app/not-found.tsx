import Link from 'next/link';
import { Ornament } from '@/components/icons/Ornament';

/**
 * 全局 404 · 此页未在卷宗中
 */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-prose pt-section text-center">
      <p className="font-display tracking-display text-[11px] text-sepia uppercase mb-4">
        Folio Not Found · CDIV
      </p>
      <h1 className="font-serif text-6xl text-ink-brown num-osf mb-6">404</h1>

      <div className="flex justify-center mb-6 text-leather">
        <LostPageIcon />
      </div>

      <p className="font-serif italic text-lg text-leather mb-2">
        页面不存在
      </p>
      <p className="font-sans text-sm text-sepia mb-8 max-w-md mx-auto leading-relaxed">
        你找的页面可能已被删除，或链接有误。
      </p>

      <div className="flex justify-center mb-7 text-leather">
        <Ornament width={64} />
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center h-10 px-5 bg-ink-brown text-vellum hover:bg-wax-red font-serif text-sm rounded-sm transition-colors"
        >
          回到首页
        </Link>
      </div>
    </div>
  );
}

/** 散页插图 —— 几张错位的纸 */
function LostPageIcon() {
  return (
    <svg width="120" height="90" viewBox="0 0 120 90" fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" aria-hidden="true">
      {/* 底层散页 */}
      <rect x="14" y="22" width="42" height="58" transform="rotate(-12 35 51)" opacity="0.4" />
      <rect x="62" y="14" width="42" height="58" transform="rotate(8 83 43)" opacity="0.6" />
      {/* 顶层主页 */}
      <rect x="38" y="10" width="46" height="62" />
      <path d="M44 22 H78" opacity="0.7" />
      <path d="M44 28 H78" opacity="0.7" />
      <path d="M44 34 H72" opacity="0.7" />
      {/* 中央问号 —— 衬线斜体感 */}
      <text
        x="61"
        y="58"
        textAnchor="middle"
        fontFamily="Cormorant Garamond, serif"
        fontStyle="italic"
        fontSize="22"
        fill="currentColor"
        stroke="none"
      >
        ?
      </text>
    </svg>
  );
}
