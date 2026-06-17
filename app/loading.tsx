import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { Ornament } from '@/components/icons/Ornament';

/** 首页 Feed 骨架 —— 卷宗目录加载中 */
export default function FeedLoading() {
  return (
    <div className="mx-auto max-w-prose">
      {/* Hero 占位 */}
      <header className="text-center mb-10 mt-2">
        <Skeleton className="h-3 w-24 mx-auto mb-4" />
        <Skeleton className="h-9 w-40 mx-auto mb-3" />
        <Skeleton className="h-3 w-56 mx-auto" />
        <div className="flex justify-center mt-5 text-paper-edge">
          <Ornament width={64} />
        </div>
      </header>

      {/* FilterBar 占位 */}
      <Skeleton bordered className="h-12 mb-8" />

      {/* 列表占位 */}
      <ol className="space-y-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i}>
            <SkeletonCard />
          </li>
        ))}
      </ol>
    </div>
  );
}
