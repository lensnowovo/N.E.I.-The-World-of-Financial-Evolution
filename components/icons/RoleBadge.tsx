import { clsx } from 'clsx';

type Props = {
  role: string;            // 'VC' | 'PE' | 'FA'
  size?: number;           // px
  className?: string;
  title?: string;
};

/**
 * 身份徽章 · 极简纹章
 * 三枚 SVG 共享同一盾形外框，仅内饰不同
 *   VC —— 向上箭头（早期成长意象）
 *   PE —— 三柱式天平（成熟、结构）
 *   FA —— 交叉斜线（撮合、连接）
 *
 * 颜色统一 var(--gilded)，描边 1px
 * 这是页面里允许出现"明显骑士感"的唯一位置之一
 */
export function RoleBadge({ role, size = 20, className, title }: Props) {
  const label = title ?? roleFullName(role);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label={label}
      className={clsx('inline-block align-[-3px] text-gilded', className)}
    >
      <title>{label}</title>
      {/* 盾形外框 —— 三段贝塞尔，顶部双肩 + 底部尖角 */}
      <path
        d="M12 2 L20 4.5 V11.5 C20 16 16.5 19.5 12 22 C7.5 19.5 4 16 4 11.5 V4.5 Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
        fill="none"
      />
      {/* 内饰：根据 role 切换 */}
      {role === 'VC' && <VCMark />}
      {role === 'PE' && <PEMark />}
      {role === 'FA' && <FAMark />}
    </svg>
  );
}

/** 早期成长：向上箭头（带尾） */
function VCMark() {
  return (
    <g stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none">
      <path d="M12 16 V8" />
      <path d="M9 11 L12 8 L15 11" strokeLinejoin="round" />
      <path d="M10.5 17 H13.5" />
    </g>
  );
}

/** 成熟结构：三柱 + 顶横线 */
function PEMark() {
  return (
    <g stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none">
      <path d="M8 9 H16" />
      <path d="M8 9 V16" />
      <path d="M12 9 V16" />
      <path d="M16 9 V16" />
      <path d="M7.5 17 H16.5" />
    </g>
  );
}

/** 撮合连接：双向交叉斜线 */
function FAMark() {
  return (
    <g stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none">
      <path d="M8 9 L12 13 L8 17" />
      <path d="M16 9 L12 13 L16 17" />
      <circle cx="12" cy="13" r="0.6" fill="currentColor" stroke="none" />
    </g>
  );
}

function roleFullName(r: string) {
  if (r === 'VC') return 'VC · Venture Capital';
  if (r === 'PE') return 'PE · Private Equity';
  if (r === 'FA') return 'FA · Financial Advisor';
  return r;
}
