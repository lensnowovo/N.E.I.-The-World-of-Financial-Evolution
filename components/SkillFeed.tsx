'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PostCard } from '@/components/PostCard';
import type { PostCardData } from '@/lib/types';

type SkillFeedResponse = {
  items: PostCardData[];
  page: number;
  hasMore: boolean;
  total: number;
};

const PAGE_SIZE = 24;

export function SkillFeed({
  initialItems,
  initialHasMore,
  initialTotal,
  currentUserId,
  querySignature,
}: {
  initialItems: PostCardData[];
  initialHasMore: boolean;
  initialTotal: number;
  currentUserId: number | null;
  querySignature: string;
}) {
  const params = useSearchParams();
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setItems(initialItems);
    setPage(1);
    setHasMore(initialHasMore);
    setTotal(initialTotal);
    setLoading(false);
    setError('');
  }, [initialItems, initialHasMore, initialTotal, querySignature]);

  const loadNext = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError('');
    const nextPage = page + 1;
    const nextParams = new URLSearchParams(params.toString());
    nextParams.set('page', String(nextPage));
    nextParams.set('pageSize', String(PAGE_SIZE));

    try {
      const res = await fetch(`/api/posts?${nextParams.toString()}`);
      if (!res.ok) throw new Error('load failed');
      const data = (await res.json()) as SkillFeedResponse;
      setItems((prev) => mergeById(prev, data.items));
      setPage(data.page);
      setHasMore(data.hasMore);
      setTotal(data.total);
    } catch {
      setError('加载失败，稍后再试');
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, page, params]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadNext();
      },
      { rootMargin: '640px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadNext]);

  if (items.length === 0) return <EmptyFeed />;

  return (
    <div>
      <div className="mb-4 flex items-baseline gap-2">
        <p className="font-serif italic text-sm text-leather">
          当前视图 · 已展示 <span className="num-osf text-ink-brown not-italic">{items.length}</span>
          {total > 0 && (
            <>
              {' '} / <span className="num-osf text-ink-brown not-italic">{total}</span>
            </>
          )}{' '}
          条
        </p>
        <span className="flex-1 h-px bg-paper-edge" />
      </div>

      <ol className="columns-1 gap-4 md:columns-2 xl:columns-3">
        {items.map((post, i) => (
          <li key={post.id} className="mb-4 break-inside-avoid animate-fade-up" style={{ animationDelay: `${Math.min((i % PAGE_SIZE) * 28, 280)}ms` }}>
            <PostCard post={post} currentUserId={currentUserId} variant="compact" />
          </li>
        ))}
      </ol>

      <div ref={sentinelRef} className="h-16" aria-hidden="true" />

      <div className="pb-8 text-center">
        {loading && <p className="font-serif italic text-sm text-sepia">继续整理卷宗中...</p>}
        {error && (
          <button
            type="button"
            onClick={() => void loadNext()}
            className="font-serif text-sm text-ink-brown underline underline-offset-4 decoration-paper-edge hover:decoration-wax-red"
          >
            {error} · 重试
          </button>
        )}
        {!loading && !hasMore && !error && (
          <p className="font-serif italic text-sm text-sepia">
            已到目录底部 · 换个任务或关键词继续探索
          </p>
        )}
      </div>
    </div>
  );
}

function mergeById(prev: PostCardData[], next: PostCardData[]) {
  const seen = new Set(prev.map((item) => item.id));
  return [...prev, ...next.filter((item) => !seen.has(item.id))];
}

function EmptyFeed() {
  return (
    <div className="border border-paper-edge bg-vellum rounded-md py-16 px-8 text-center">
      <p className="font-serif italic text-leather text-lg mb-2">当前条件下没有找到 Skill</p>
      <p className="font-sans text-sm text-sepia">换个关键词，或清空筛选看看全部目录。</p>
      <div className="mt-6">
        <Link
          href="/#skill-library"
          className="inline-flex items-center h-9 px-4 border border-ink-brown text-ink-brown hover:bg-ink-brown hover:text-vellum font-serif text-sm rounded-sm transition-colors"
        >
          清空 · 显示全部
        </Link>
      </div>
    </div>
  );
}
