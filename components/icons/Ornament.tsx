import { cn } from '@/lib/cn';
import type { CSSProperties } from 'react';

/**
 * 段落分隔花体 —— 类似 ❦ 的轻装饰
 * 每页限用 1-2 次（如章节间、footer）
 * 高 16px 单色细线，不带任何动效
 */
export function Ornament({
  className,
  width = 80,
  style,
  continuous = false,
}: {
  className?: string;
  width?: number;
  style?: CSSProperties;
  continuous?: boolean;
}) {
  return (
    <svg
      width={width}
      height={16}
      viewBox="0 0 80 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      className={cn('text-leather', className)}
      style={style}
      aria-hidden="true"
    >
      {/* 左横线 */}
      <path d={continuous ? 'M0 8 H28' : 'M2 8 H28'} strokeLinecap={continuous ? 'butt' : 'round'} />
      {/* 中央三叶饰：两片侧叶 + 中心菱形 */}
      <path d="M30 8 C32 6, 35 6, 36 8 C35 10, 32 10, 30 8 Z" />
      <path d="M50 8 C48 6, 45 6, 44 8 C45 10, 48 10, 50 8 Z" />
      <path d="M40 5 L43 8 L40 11 L37 8 Z" />
      <circle cx="40" cy="8" r="0.8" fill="currentColor" stroke="none" />
      {/* 右横线 */}
      <path d={continuous ? 'M52 8 H80' : 'M52 8 H78'} strokeLinecap={continuous ? 'butt' : 'round'} />
    </svg>
  );
}
