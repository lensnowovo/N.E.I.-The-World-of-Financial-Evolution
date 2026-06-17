import Link from 'next/link';
import { PostCard } from '@/components/PostCard';
import type { PostCardData } from '@/lib/types';

/**
 * 首页「投资流程阶段」分组。
 *
 * 每组最多显示 MAX_VISIBLE 个卡片，超出显示「查看全部 →」链接，
 * 跳转到 /stage/[value] 展示该阶段全部内容（带分页）。
 * 避免首页被某个大组撑爆，同时保留"一屏看清全流程"的概览价值。
 */
const MAX_VISIBLE = 9;

export function StageGroup({
  label,
  stageValue,
  items,
  uid,
}: {
  label: string;
  stageValue: string;
  items: PostCardData[];
  uid: number | null;
}) {
  const visible = items.slice(0, MAX_VISIBLE);
  const hasMore = items.length > MAX_VISIBLE;
  const hiddenCount = items.length - MAX_VISIBLE;

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="font-serif text-xl text-ink-brown">{label}</h2>
        <span className="font-mono text-[11px] text-sepia">{items.length}</span>
        <span className="flex-1 h-px bg-paper-edge" />
      </div>

      <ol className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visible.map((p, i) => (
          <li key={p.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i * 40, 320)}ms` }}>
            <PostCard post={p} currentUserId={uid} variant="compact" />
          </li>
        ))}
      </ol>

      {hasMore && (
        <div className="mt-5 text-center">
          <Link
            href={`/stage/${stageValue}`}
            className="inline-flex items-center gap-1.5 h-9 px-5 border border-paper-edge bg-vellum hover:border-ink-brown font-serif text-sm text-leather hover:text-ink-brown rounded-sm transition-colors"
          >
            查看全部
            <span className="font-mono text-[11px] text-sepia">+{hiddenCount}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M2 5 H8 M5.5 2 L8 5 L5.5 8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
