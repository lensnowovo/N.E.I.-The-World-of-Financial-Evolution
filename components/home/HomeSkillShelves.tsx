'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { PostCard } from '@/components/PostCard';
import { ChapterRule } from '@/components/icons/ChapterRule';
import type { HomeSkillShelf } from '@/lib/home-shelves';
import type { PostCardData } from '@/lib/types';

export function HomeSkillShelves({
  shelves,
  currentUserId,
}: {
  shelves: HomeSkillShelf[];
  currentUserId: number | null;
}) {
  return (
    <div className="space-y-7 sm:space-y-9">
      {shelves.map((shelf, shelfIndex) => (
        <SkillShelf
          key={shelf.value}
          shelf={shelf}
          shelfIndex={shelfIndex}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}

function SkillShelf({
  shelf,
  shelfIndex,
  currentUserId,
}: {
  shelf: HomeSkillShelf;
  shelfIndex: number;
  currentUserId: number | null;
}) {
  const [items, setItems] = useState(shelf.items);
  const [activeQuery, setActiveQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  const selectFilter = async (query: string) => {
    if (query === activeQuery) return;
    requestRef.current?.abort();
    setError('');

    if (!query) {
      setItems(shelf.items);
      setActiveQuery('');
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    try {
      const params = new URLSearchParams(query);
      if (!params.has('sort')) params.set('sort', 'popular');
      params.set('page', '1');
      params.set('pageSize', '6');
      const response = await fetch(`/api/posts?${params.toString()}`, { signal: controller.signal });
      if (!response.ok) throw new Error('filter request failed');
      const data = (await response.json()) as { items: PostCardData[] };
      setItems(data.items);
      setActiveQuery(query);
    } catch (filterError) {
      if ((filterError as Error).name !== 'AbortError') setError('暂时无法切换，请稍后重试');
    } finally {
      if (requestRef.current === controller) setLoading(false);
    }
  };

  return (
    <section
      aria-labelledby={`skill-shelf-${shelf.value}`}
      className="relative bg-vellum/40 backdrop-blur-[1px]"
    >
      <ShelfChapterRule />
      <header className="grid lg:grid-cols-[156px_minmax(0,1fr)_auto] lg:items-stretch">
        <div className="relative flex items-center justify-between bg-parchment/30 px-4 py-3 lg:block lg:px-5 lg:py-5">
          <span className="font-display text-[9px] uppercase tracking-display text-sepia">
            Desk {shelf.mark}
          </span>
          <span className="num-osf font-serif text-3xl italic text-gilded/80 lg:mt-3 lg:block lg:text-4xl">
            {shelf.mark}
          </span>
        </div>

        <div className="min-w-0 px-4 py-4 sm:px-5 lg:py-5">
          <p className="font-display text-[9px] uppercase tracking-display text-sepia">
            {shelf.eyebrow}
          </p>
          <h3
            id={`skill-shelf-${shelf.value}`}
            className="mt-1 font-serif text-xl text-ink-brown sm:text-2xl"
          >
            {shelf.label}
          </h3>
          <p className="mt-1 max-w-2xl font-sans text-xs leading-5 text-sepia sm:text-[13px]">
            {shelf.description}
          </p>
        </div>

        <div className="flex items-end px-4 pb-4 sm:px-5 lg:items-center lg:pb-0">
          <Link
            href={shelf.href}
            className="group inline-flex w-fit items-center gap-2 border-b border-sepia/45 pb-1 font-serif text-sm text-leather transition-colors hover:border-wax-red hover:text-wax-red"
          >
            查看全部
            <span className="font-mono text-[10px] text-sepia">{shelf.total}</span>
            <span className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">→</span>
          </Link>
        </div>
      </header>

      {shelf.filters.length > 0 && (
        <nav
              aria-label={`${shelf.label}子目录`}
              className="flex items-center gap-1 overflow-x-auto bg-parchment/25 px-4 py-2.5 sm:flex-wrap sm:px-5"
            >
              <span className="mr-1 shrink-0 font-display text-[9px] uppercase tracking-display text-gilded">
                Index
              </span>
              <button
                type="button"
                onClick={() => void selectFilter('')}
                aria-pressed={activeQuery === ''}
                className={`inline-flex h-6 shrink-0 items-center px-2.5 font-sans text-[11px] transition-colors ${
                  activeQuery === ''
                    ? 'bg-ink-brown text-vellum'
                    : 'text-leather hover:bg-vellum/80 hover:text-ink-brown'
                }`}
              >
                推荐
              </button>
              {shelf.filters.map((filter) => (
                <button
                  key={filter.query}
                  type="button"
                  onClick={() => void selectFilter(filter.query)}
                  aria-pressed={activeQuery === filter.query}
                  className={`group inline-flex h-6 shrink-0 items-center gap-1.5 px-2.5 font-sans text-[11px] transition-colors ${
                    activeQuery === filter.query
                      ? 'bg-ink-brown text-vellum'
                      : 'text-leather hover:bg-vellum/80 hover:text-ink-brown'
                  }`}
                >
                  {filter.label}
                  <span className={`font-mono text-[9px] ${activeQuery === filter.query ? 'text-vellum/65' : 'text-sepia group-hover:text-vellum/65'}`}>
                    {filter.count}
                  </span>
                </button>
              ))}
        </nav>
      )}

      <div className="relative" aria-live="polite" aria-busy={loading}>
        {items.length > 0 ? (
            <ol className={`flex snap-x snap-mandatory gap-3 overflow-x-auto p-3 transition-opacity sm:p-4 md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-3 ${loading ? 'opacity-35' : 'opacity-100'}`}>
              {items.map((post, itemIndex) => (
                <li
                  key={`${activeQuery}-${post.id}`}
                  className="w-[82vw] max-w-[340px] shrink-0 snap-start animate-fade-up md:w-auto md:max-w-none"
                  style={{ animationDelay: `${Math.min((shelfIndex * 2 + itemIndex) * 35, 280)}ms` }}
                >
                  <PostCard post={post} currentUserId={currentUserId} variant="shelf" />
                </li>
              ))}
              {activeQuery &&
                Array.from({ length: Math.max(0, 6 - items.length) }, (_, slotIndex) => (
                  <li
                    key={`empty-${activeQuery}-${slotIndex}`}
                    className="hidden min-h-[230px] items-center justify-center border border-dashed border-paper-edge bg-parchment/20 px-6 text-center md:flex"
                  >
                    <div>
                      <p className="font-display text-[9px] uppercase tracking-display text-gilded">
                        Open Slot {String(items.length + slotIndex + 1).padStart(2, '0')}
                      </p>
                      <p className="mt-2 font-serif text-base text-leather">这一格还空着</p>
                      <Link
                        href="/publish"
                        className="mt-3 inline-flex border-b border-sepia/45 pb-0.5 font-serif italic text-xs text-sepia hover:border-wax-red hover:text-wax-red"
                      >
                        投稿补充这个分类 →
                      </Link>
                    </div>
                  </li>
                ))}
            </ol>
        ) : (
            <p className="m-4 border border-dashed border-paper-edge px-4 py-8 text-center font-serif italic text-sm text-sepia">
              当前索引下还没有公开 Skill，欢迎贡献第一条。
            </p>
        )}
        {loading && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="border border-paper-edge bg-vellum/95 px-3 py-1.5 font-serif italic text-xs text-sepia shadow-card">
                正在翻阅目录…
              </span>
            </div>
        )}
      </div>
      {error && <p className="px-4 pb-3 font-sans text-xs text-wax-red">{error}</p>}
    </section>
  );
}

function ShelfChapterRule() {
  return (
    <ChapterRule className="absolute inset-x-0 top-0 -translate-y-1/2" />
  );
}
