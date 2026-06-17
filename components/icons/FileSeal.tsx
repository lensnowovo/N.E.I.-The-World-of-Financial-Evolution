import { cn } from '@/lib/cn';

/**
 * 文件类型蜡封 · 圆形 SVG 印章风
 * 中央衬线斜体显示扩展名（PDF / DOCX / …）
 * 仅描边，无填充；color 默认 leather
 */
export function FileSeal({
  ext,
  size = 44,
  className,
}: {
  ext: string;
  size?: number;
  className?: string;
}) {
  const label = ext.toUpperCase().slice(0, 4);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      className={cn('text-leather', className)}
      aria-hidden="true"
    >
      {/* 外圆 */}
      <circle cx="22" cy="22" r="20" fill="var(--vellum)" stroke="currentColor" strokeWidth="1" />
      {/* 内圆 —— 双圈纹章感 */}
      <circle cx="22" cy="22" r="17" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
      {/* 四个小铆点 */}
      {[0, 90, 180, 270].map((deg) => (
        <circle
          key={deg}
          cx={22 + 17 * Math.cos((deg * Math.PI) / 180)}
          cy={22 + 17 * Math.sin((deg * Math.PI) / 180)}
          r="0.7"
          fill="currentColor"
        />
      ))}
      {/* 中央扩展名 */}
      <text
        x="22"
        y="26"
        textAnchor="middle"
        fontFamily="Cormorant Garamond, serif"
        fontStyle="italic"
        fontSize={label.length > 3 ? '9' : '11'}
        fill="currentColor"
        letterSpacing="0.04em"
      >
        {label}
      </text>
    </svg>
  );
}
