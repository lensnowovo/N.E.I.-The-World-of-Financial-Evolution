'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/cn';
import { INDUSTRY_TAGS, sceneLabel } from '@/lib/tags';

const SCENE_GROUPS = [
  {
    title: '投前',
    mark: 'I',
    items: ['sourcing', 'screening', 'industry-research', 'business-dd'],
  },
  {
    title: '投中',
    mark: 'II',
    items: ['financial', 'legal', 'ic'],
  },
  {
    title: '投后',
    mark: 'III',
    items: ['post-investment', 'fundraising', 'fund-ops', 'crm'],
  },
] as const;

export function FilterStrip() {
  const router = useRouter();
  const params = useSearchParams();

  const q = params.get('q') || '';
  const scene = params.get('scene') || '';
  const industry = params.get('industry') || '';
  const legacySkill = params.get('skill') || '';
  const legacyContents = params.getAll('content');
  const mcp = params.get('mcp') || '';
  const attachment = params.get('attachment') || '';
  const featured = params.get('featured') || '';
  const time = params.get('time') || '';
  const sort = params.get('sort') || (q ? 'relevance' : 'popular');
  const [industryOpen, setIndustryOpen] = useState(!!industry);

  useEffect(() => {
    if (window.location.hash !== '#skill-library') return;
    window.requestAnimationFrame(() => {
      document.getElementById('skill-library')?.scrollIntoView({ block: 'start' });
    });
  }, []);

  const pushParams = useCallback(
    (next: URLSearchParams) => {
      next.delete('page');
      router.push(toLibraryHref(next), { scroll: false });
      window.requestAnimationFrame(() => {
        document.getElementById('skill-library')?.scrollIntoView({ block: 'start' });
      });
    },
    [router],
  );

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      pushParams(next);
    },
    [params, pushParams],
  );

  const toggleParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (next.get(key) === value) next.delete(key);
      else next.set(key, value);
      pushParams(next);
    },
    [params, pushParams],
  );

  const hasAnyFilter = !!(
    q ||
    scene ||
    industry ||
    legacySkill ||
    legacyContents.length ||
    mcp ||
    attachment ||
    featured ||
    time ||
    params.get('sort')
  );

  return (
    <section className="border-y border-paper-edge py-4 mb-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-paper-edge pb-3">
          <FilterLabel>目录</FilterLabel>
          <SealChip active={scene === ''} onClick={() => setParam('scene', '')}>
            全部
          </SealChip>
          {hasAnyFilter && (
            <button
              type="button"
              onClick={() => pushParams(new URLSearchParams())}
              className="ml-auto inline-flex items-center gap-1 h-6 px-2.5 text-xs font-sans text-wax-red hover:text-ink-brown transition-colors"
            >
              <ClearIcon />
              清空
            </button>
          )}
        </div>

        <div className="space-y-2.5">
          {SCENE_GROUPS.map((group) => (
            <div
              key={group.title}
              className="grid gap-2 sm:grid-cols-[96px_1fr] sm:items-center"
            >
              <StageLabel mark={group.mark}>{group.title}</StageLabel>
              <div className="flex flex-wrap items-center gap-1.5 sm:border-l sm:border-paper-edge sm:pl-4">
                {group.items.map((value) => (
                  <SealChip key={value} active={scene === value} onClick={() => setParam('scene', value)}>
                    {sceneLabel(value)}
                  </SealChip>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setIndustryOpen((value) => !value)}
            className="inline-flex items-center gap-1.5 font-sans text-xs text-sepia hover:text-ink-brown transition-colors"
          >
            <svg
              className={cn('transition-transform', industryOpen && 'rotate-90')}
              width="9"
              height="9"
              viewBox="0 0 10 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M3 1.5 L7 5 L3 8.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            行业
            {industry && (
              <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-wax-red text-vellum rounded-full num-osf">
                1
              </span>
            )}
          </button>

          {industryOpen && (
            <div className="mt-3 pt-3 border-t border-paper-edge">
              <div className="flex flex-wrap items-center gap-1.5">
                <FilterLabel>行业</FilterLabel>
                <PillChip active={industry === ''} onClick={() => setParam('industry', '')}>
                  不限
                </PillChip>
                {INDUSTRY_TAGS.map((item) => (
                  <PillChip key={item.value} active={industry === item.value} onClick={() => setParam('industry', item.value)}>
                    {item.label}
                  </PillChip>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-paper-edge pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterLabel>更多</FilterLabel>
            <TabChip active={mcp === 'ready'} onClick={() => toggleParam('mcp', 'ready')}>
              MCP Ready
            </TabChip>
            <TabChip active={attachment === '1'} onClick={() => toggleParam('attachment', '1')}>
              有附件
            </TabChip>
            <TabChip active={featured === '1'} onClick={() => toggleParam('featured', '1')}>
              精选
            </TabChip>
            <TabChip active={time === '30d'} onClick={() => toggleParam('time', '30d')}>
              最近更新
            </TabChip>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <FilterLabel>排序</FilterLabel>
            <div className="inline-flex border border-paper-edge rounded-sm overflow-hidden">
              {q && (
                <SegTab active={sort === 'relevance'} onClick={() => setParam('sort', 'relevance')}>
                  相关
                </SegTab>
              )}
              <SegTab active={sort === 'popular'} onClick={() => setParam('sort', 'popular')}>
                热门
              </SegTab>
              <SegTab active={sort === 'latest'} onClick={() => setParam('sort', 'latest')}>
                最新
              </SegTab>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function toLibraryHref(params: URLSearchParams) {
  const query = params.toString();
  return query ? `/?${query}#skill-library` : '/#skill-library';
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-display tracking-display text-[10px] text-sepia uppercase mr-0.5 select-none">
      {children}
    </span>
  );
}

function StageLabel({ mark, children }: { mark: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[18px_44px] items-baseline gap-2 select-none">
      <span className="text-right font-mono text-[10px] text-gilded">{mark}</span>
      <span className="font-serif text-lg leading-none text-ink-brown">{children}</span>
    </div>
  );
}

function SealChip({ active, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-2.5 h-6 text-xs font-serif uppercase tracking-wide transition-colors',
        active
          ? 'border border-ink-brown bg-ink-brown text-vellum'
          : 'border border-paper-edge text-leather hover:border-ink-brown hover:text-ink-brown',
      )}
    >
      {children}
    </button>
  );
}

function TabChip({ active, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-2.5 h-6 text-xs font-sans transition-colors border-b-2',
        active ? 'border-wax-red text-ink-brown' : 'border-transparent text-sepia hover:text-ink-brown',
      )}
    >
      {children}
    </button>
  );
}

function SegTab({ active, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-3 h-7 text-xs font-sans transition-colors',
        active ? 'bg-ink-brown text-vellum' : 'bg-vellum text-leather hover:text-ink-brown',
      )}
    >
      {children}
    </button>
  );
}

function PillChip({ active, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-3 h-6 text-xs font-sans rounded-full transition-colors',
        active ? 'bg-leather text-vellum' : 'bg-linen text-leather hover:bg-paper-edge',
      )}
    >
      {children}
    </button>
  );
}

function ClearIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M1 1 L9 9 M9 1 L1 9" strokeLinecap="round" />
    </svg>
  );
}

type ChipProps = {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
};
