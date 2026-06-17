import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { Ornament } from '@/components/icons/Ornament';

export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-prose">
      {/* Hero */}
      <div className="border border-paper-edge bg-vellum rounded-md px-8 py-10 mb-10 text-center">
        <Skeleton className="h-3 w-24 mx-auto mb-5" />
        <Skeleton className="w-16 h-16 mx-auto mb-5" rounded="full" />
        <Skeleton className="h-8 w-40 mx-auto mb-2" />
        <Skeleton className="h-3 w-32 mx-auto mb-5" />
        <div className="flex justify-center mb-5 text-paper-edge">
          <Ornament width={56} />
        </div>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>

      {/* Tab strip */}
      <div className="flex justify-center gap-8 mb-8 border-b border-paper-edge pb-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>

      <ol className="space-y-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i}>
            <SkeletonCard />
          </li>
        ))}
      </ol>
    </div>
  );
}
