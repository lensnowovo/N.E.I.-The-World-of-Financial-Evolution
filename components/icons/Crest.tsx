import { clsx } from 'clsx';

/**
 * 角落细线纹章框 —— 四个 12×12 直角装饰
 * 用法：包在 relative 容器外层，绝对定位到四角
 * 仅在关键卡片（如 Hero、登录卡）使用，普通卡片不要
 */
export function CrestCorners({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'pointer-events-none absolute inset-0 text-leather/60',
        className,
      )}
      aria-hidden="true"
    >
      <CornerMark className="absolute left-0 top-0" />
      <CornerMark className="absolute right-0 top-0 -scale-x-100" />
      <CornerMark className="absolute left-0 bottom-0 -scale-y-100" />
      <CornerMark className="absolute right-0 bottom-0 -scale-x-100 -scale-y-100" />
    </div>
  );
}

function CornerMark({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="square"
      className={className}
    >
      {/* 外直角 */}
      <path d="M0 4 V0 H4" />
      {/* 内小钩 */}
      <path d="M3 6 V3 H6" opacity="0.6" />
    </svg>
  );
}
