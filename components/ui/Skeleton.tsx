import { cn } from '@/lib/cn';

/**
 * Skeleton · 骨架占位
 * 用 linen 块 + 极轻 opacity 呼吸动效（不闪烁、不 shimmer）
 * 形状默认 1px 圆角，文本块自动加描边
 */
export function Skeleton({
  className,
  rounded = 'sm',
  bordered,
  ...rest
}: {
  className?: string;
  rounded?: 'none' | 'sm' | 'full';
  bordered?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-linen pevc-pulse',
        rounded === 'sm' && 'rounded-sm',
        rounded === 'full' && 'rounded-full',
        bordered && 'border border-paper-edge',
        className,
      )}
      aria-hidden="true"
      {...rest}
    />
  );
}

/** 文本行 —— 一组 1.2em 高的 linen 横条 */
export function SkeletonLine({
  width = '100%',
  className,
}: {
  width?: string;
  className?: string;
}) {
  return <Skeleton className={cn('h-3', className)} style={{ width }} />;
}

/** 一张 PostCard 占位 —— 与真实 PostCard 高度对齐，避免布局跳动 */
export function SkeletonCard() {
  return (
    <div className="border border-paper-edge bg-vellum rounded-md p-6 sm:p-7">
      {/* 作者条 */}
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="w-4 h-4" rounded="none" />
        <SkeletonLine width="80px" />
        <SkeletonLine width="60px" />
      </div>
      {/* 标题 */}
      <Skeleton className="h-5 w-3/4 mb-2.5" />
      <Skeleton className="h-5 w-1/2 mb-4" />
      {/* 摘要 */}
      <Skeleton className="h-3 w-full mb-2" />
      <Skeleton className="h-3 w-5/6 mb-5" />
      {/* 标签 */}
      <div className="flex gap-1.5 mb-4">
        <Skeleton className="h-6 w-20" rounded="none" />
        <Skeleton className="h-6 w-16" rounded="full" />
        <Skeleton className="h-6 w-16" rounded="none" />
      </div>
      {/* 互动条 */}
      <div className="pt-4 border-t border-paper-edge flex items-center gap-5">
        <SkeletonLine width="40px" />
        <SkeletonLine width="40px" />
      </div>
    </div>
  );
}
