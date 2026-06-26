'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/cn';
import { SCENE_TAGS, SKILL_TAGS, INDUSTRY_TAGS, CONTENT_TAGS } from '@/lib/tags';
import { SkillIcon } from '@/components/icons/SkillIcon';

export function FilterStrip() {
  const router = useRouter();
  const params = useSearchParams();

  const q = params.get('q') || '';
  const scene = params.get('scene') || '';
  const skill = params.get('skill') || '';
  const industry = params.get('industry') || '';
  const contents = params.getAll('content');
  const mcp = params.get('mcp') || '';
  const attachment = params.get('attachment') || '';
  const featured = params.get('featured') || '';
  const time = params.get('time') || '';
  const sort = params.get('sort') || (q ? 'relevance' : 'popular');

  const hasTopicFilter = !!industry || contents.length > 0;
  const [topicsOpen, setTopicsOpen] = useState(hasTopicFilter);

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

  const toggleContent = useCallback(
    (value: string) => {
      const next = new URLSearchParams(params.toString());
      const current = next.getAll('content');
      next.delete('content');
      const selected = current.includes(value)
        ? current.filter((item) => item !== value)
        : current.length >= 3
          ? current
          : [...current, value];
      selected.forEach((item) => next.append('content', item));
      pushParams(next);
    },
    [params, pushParams],
  );

  const hasAnyFilter = !!(
    q ||
    scene ||
    skill ||
    industry ||
    contents.length ||
    mcp ||
    attachment ||
    featured ||
    time ||
    params.get('sort')
  );

  return (
    <section className="border-y border-paper-edge py-4 mb-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterLabel>任务阶段</FilterLabel>
          <SealChip active={scene === ''} onClick={() => setParam('scene', '')}>
            全部
          </SealChip>
          {SCENE_TAGS.map((item) => (
            <SealChip key={item.value} active={scene === item.value} onClick={() => setParam('scene', item.value)}>
              {item.label}
            </SealChip>
          ))}
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

        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterLabel>交付物</FilterLabel>
            <BadgeChip active={skill === ''} onClick={() => setParam('skill', '')}>
              全部
            </BadgeChip>
            {SKILL_TAGS.map((item) => (
              <BadgeChip key={item.value} active={skill === item.value} onClick={() => setParam('skill', item.value)}>
                <SkillIcon skill={item.value} className="h-3 w-3" />
                {item.label}
              </BadgeChip>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterLabel>可用性</FilterLabel>
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

        <div>
          <button
            type="button"
            onClick={() => setTopicsOpen((value) => !value)}
            className="inline-flex items-center gap-1.5 font-sans text-xs text-sepia hover:text-ink-brown transition-colors"
          >
            <svg
              className={cn('transition-transform', topicsOpen && 'rotate-90')}
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
            行业 / 主题
            {hasTopicFilter && (
              <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-wax-red text-vellum rounded-full num-osf">
                {(industry ? 1 : 0) + contents.length}
              </span>
            )}
          </button>

          {topicsOpen && (
            <div className="mt-3 pt-3 border-t border-paper-edge space-y-3">
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

              <div className="flex flex-wrap items-center gap-1.5">
                <FilterLabel>主题{contents.length > 0 && `（${contents.length}/3）`}</FilterLabel>
                {CONTENT_TAGS.map((item) => {
                  const active = contents.includes(item.value);
                  return (
                    <FoldChip
                      key={item.value}
                      active={active}
                      disabled={!active && contents.length >= 3}
                      onClick={() => toggleContent(item.value)}
                    >
                      {item.label}
                    </FoldChip>
                  );
                })}
              </div>
            </div>
          )}
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

function BadgeChip({ active, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-2.5 h-6 text-xs font-sans rounded-full transition-colors',
        active
          ? 'bg-gilded/15 border border-gilded text-ink-brown'
          : 'bg-vellum border border-gilded/40 text-leather hover:border-gilded',
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

function FoldChip({
  active,
  disabled,
  onClick,
  children,
}: ChipProps & { disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center px-2.5 h-6 text-xs font-sans transition-colors',
        active
          ? 'border border-ink-brown bg-parchment text-ink-brown'
          : 'border border-paper-edge bg-parchment text-leather hover:border-sepia',
        disabled && 'opacity-40 cursor-not-allowed',
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
