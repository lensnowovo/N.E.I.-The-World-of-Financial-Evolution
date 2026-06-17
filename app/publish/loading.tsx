import { Skeleton } from '@/components/ui/Skeleton';
import { Ornament } from '@/components/icons/Ornament';

export default function PublishLoading() {
  return (
    <div className="mx-auto max-w-prose">
      <header className="text-center mb-10 mt-2">
        <Skeleton className="h-3 w-28 mx-auto mb-4" />
        <Skeleton className="h-9 w-32 mx-auto mb-3" />
        <Skeleton className="h-3 w-72 mx-auto" />
        <div className="flex justify-center mt-5 text-paper-edge">
          <Ornament width={64} />
        </div>
      </header>

      <div className="space-y-section">
        {/* 作者条 */}
        <div className="flex items-center gap-3 pb-5 border-b border-paper-edge">
          <Skeleton className="w-6 h-6" rounded="none" />
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-10" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        {/* 标题 */}
        <div>
          <Skeleton className="h-4 w-20 mb-3" />
          <Skeleton className="h-10 w-full" />
        </div>
        {/* 正文 */}
        <div>
          <Skeleton className="h-4 w-20 mb-3" />
          <Skeleton bordered className="h-72 w-full" />
        </div>
        {/* 标签 */}
        <div>
          <Skeleton className="h-4 w-24 mb-4" />
          <div className="space-y-3">
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-24" rounded="none" />
              ))}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-20" rounded="full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
