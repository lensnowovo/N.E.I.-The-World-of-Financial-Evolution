import { Skeleton, SkeletonLine } from '@/components/ui/Skeleton';
import { Ornament } from '@/components/icons/Ornament';

export default function PostLoading() {
  return (
    <article className="mx-auto max-w-prose">
      {/* 返回 */}
      <Skeleton className="h-3 w-28 mb-6" />

      {/* 卷首 */}
      <header className="text-center mb-10">
        <Skeleton className="h-3 w-32 mx-auto mb-4" />
        <Skeleton className="h-10 w-4/5 mx-auto mb-3" />
        <Skeleton className="h-10 w-2/3 mx-auto mb-6" />
        <div className="flex items-center justify-center gap-3 mb-5">
          <Skeleton className="w-5 h-5" rounded="none" />
          <SkeletonLine width="120px" />
          <SkeletonLine width="80px" />
        </div>
        <div className="flex justify-center text-paper-edge">
          <Ornament width={80} />
        </div>
      </header>

      {/* 正文 —— 模拟首字下沉 + 段落 */}
      <div className="space-y-3 mb-10">
        <div className="flex items-start gap-3">
          <Skeleton className="w-12 h-12" rounded="none" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
            <Skeleton className="h-4 w-9/12" />
          </div>
        </div>
        <div className="space-y-2 pt-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-10/12" />
        </div>
        <Skeleton className="h-5 w-1/3 mt-6 mb-2" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
        </div>
      </div>

      {/* 标签 */}
      <div className="border-t border-paper-edge pt-6 flex flex-wrap gap-2">
        <Skeleton className="h-6 w-20" rounded="none" />
        <Skeleton className="h-6 w-16" rounded="full" />
        <Skeleton className="h-6 w-20" rounded="none" />
      </div>
    </article>
  );
}
