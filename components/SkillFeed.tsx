'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PostCard } from '@/components/PostCard';
import type { PostCardData } from '@/lib/types';
import { taskMaps } from '@/lib/task-maps';

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
  const [columnCount, setColumnCount] = useState(1);
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

  useEffect(() => {
    const updateColumnCount = () => {
      if (window.matchMedia('(min-width: 1280px)').matches) setColumnCount(3);
      else if (window.matchMedia('(min-width: 768px)').matches) setColumnCount(2);
      else setColumnCount(1);
    };

    updateColumnCount();
    window.addEventListener('resize', updateColumnCount);
    return () => window.removeEventListener('resize', updateColumnCount);
  }, []);

  if (items.length === 0) return <EmptyFeed />;

  const feedEntries = buildFeedEntries(items);
  const columns = splitIntoColumns(feedEntries, columnCount);

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" role="list">
        {columns.map((column, columnIndex) => (
          <ol key={columnIndex} className="space-y-4">
            {column.map((entry) => (
              <FeedItem
                key={entry.key}
                entry={entry}
                currentUserId={currentUserId}
              />
            ))}
          </ol>
        ))}
      </div>

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

type FeedEntry =
  | { type: 'post'; key: string; post: PostCardData; index: number }
  | { type: 'task'; key: string; taskIndex: number };

function buildFeedEntries(posts: PostCardData[]): FeedEntry[] {
  const entries: FeedEntry[] = [];
  posts.forEach((post, index) => {
    entries.push({ type: 'post', key: `post-${post.id}`, post, index });
    if ((index + 1) % 12 === 0) {
      entries.push({
        type: 'task',
        key: `task-${index + 1}`,
        taskIndex: Math.floor(index / 12) % taskMaps.length,
      });
    }
  });
  return entries;
}

function splitIntoColumns(entries: FeedEntry[], columnCount: number) {
  const count = Math.max(1, columnCount);
  const columns: FeedEntry[][] = Array.from({ length: count }, () => []);
  entries.forEach((entry, index) => {
    columns[index % count].push(entry);
  });
  return columns;
}

function FeedItem({
  entry,
  currentUserId,
}: {
  entry: FeedEntry;
  currentUserId: number | null;
}) {
  if (entry.type === 'post') {
    return (
      <li
        className="animate-fade-up"
        style={{ animationDelay: `${Math.min((entry.index % PAGE_SIZE) * 28, 280)}ms` }}
      >
        <PostCard post={entry.post} currentUserId={currentUserId} variant="compact" />
      </li>
    );
  }

  const task = taskMaps[entry.taskIndex];
  return (
    <li>
      <Link
        href={`/tasks/${task.slug}`}
        className="block rounded-md border border-gilded/45 bg-gilded/10 px-4 py-4 transition-colors hover:border-ink-brown"
      >
        <p className="font-display tracking-display text-[10px] uppercase text-sepia mb-1">
          Task Map
        </p>
        <h3 className="font-serif text-lg text-ink-brown">{task.title}</h3>
        <p className="mt-1.5 font-sans text-xs leading-5 text-leather">
          {task.description}
        </p>
        <p className="mt-3 font-serif italic text-sm text-sepia">
          打开工作地图 →
        </p>
      </Link>
    </li>
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
