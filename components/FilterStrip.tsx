'use client';

import { useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/cn';
import { SCENE_TAGS, SKILL_TAGS, INDUSTRY_TAGS, CONTENT_TAGS } from '@/lib/tags';
import { SkillIcon } from '@/components/icons/SkillIcon';

/**
 * FilterStrip · 首页目录头条
 *
 * 高频筛选（场景/类型/身份/时间/排序）常驻；次要筛选（行业/工作内容）
 * 收进「更多筛选」折叠区，需要精细筛选时展开。对应 PRD §5 的四维筛选。
 */
export function FilterStrip() {
  const router = useRouter();
  const params = useSearchParams();

  const scene = params.get('scene') || '';
  const skill = params.get('skill') || '';
  const role = params.get('role') || '';
  const time = params.get('time') || '';
  const industry = params.get('industry') || '';
  const contents = params.getAll('content'); // 多选
  const sort = params.get('sort') === 'latest' ? 'latest' : 'popular';

  // 次要筛选（行业/工作内容）默认折叠；已选了任一就自动展开
  const hasMinorFilter = !!industry || contents.length > 0;
  const [moreOpen, setMoreOpen] = useState(hasMinorFilter);

  const setParam = useCallback(
    (key: string, value: string) => {
      const u = new URLSearchParams(params.toString());
      if (value) u.set(key, value);
      else u.delete(key);
      router.push(toLibraryHref(u));
    },
    [params, router],
  );

  // 工作内容多选（最多 3 个，AND 关系）
  const toggleContent = useCallback(
    (v: string) => {
      const u = new URLSearchParams(params.toString());
      const current = u.getAll('content');
      u.delete('content');
      let next: string[];
      if (current.includes(v)) next = current.filter((x) => x !== v);
      else {
        if (current.length >= 3) return; // 上限 3
        next = [...current, v];
      }
      next.forEach((x) => u.append('content', x));
      router.push(toLibraryHref(u));
    },
    [params, router],
  );

  // 是否有任何筛选激活
  const hasAnyFilter = !!(scene || skill || industry || role || time || contents.length > 0);

  return (
    <section className="border-y border-paper-edge py-4 mb-6">
      {/* —— 第 1 行：场景 chip（高频）+ 清空筛选 —— */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <FilterLabel>场景</FilterLabel>
        <SealChip active={scene === ''} onClick={() => setParam('scene', '')}>
          全部
        </SealChip>
        {SCENE_TAGS.map((t) => (
          <SealChip key={t.value} active={scene === t.value} onClick={() => setParam('scene', t.value)}>
            {t.label}
          </SealChip>
        ))}
        {/* 清空筛选（有筛选时显示） */}
        {hasAnyFilter && (
          <button
            type="button"
            onClick={() => router.push('/#skill-library')}
            className="ml-auto inline-flex items-center gap-1 h-6 px-2.5 text-xs font-sans text-wax-red hover:text-ink-brown transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
              <path d="M1 1 L9 9 M9 1 L1 9" strokeLinecap="round" />
            </svg>
            清空筛选
          </button>
        )}
      </div>

      {/* —— 第 2 行：类型 + 身份 + 时间 | 排序 —— */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {/* 类型 */}
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterLabel>类型</FilterLabel>
          <BadgeChip active={skill === ''} onClick={() => setParam('skill', '')}>
            全部
          </BadgeChip>
          {SKILL_TAGS.map((t) => (
            <BadgeChip key={t.value} active={skill === t.value} onClick={() => setParam('skill', t.value)}>
              <SkillIcon skill={t.value} className="h-3 w-3" />
              {t.label}
            </BadgeChip>
          ))}
        </div>

        <Divider />

        {/* 时间 */}
        <div className="flex items-center gap-1.5">
          <FilterLabel>时间</FilterLabel>
          {TIME_OPTIONS.map((o) => (
            <TabChip key={o.value} active={time === o.value} onClick={() => setParam('time', time === o.value ? '' : o.value)}>
              {o.label}
            </TabChip>
          ))}
        </div>

        {/* 排序（右侧） */}
        <div className="ml-auto flex items-center gap-1.5">
          <FilterLabel>排序</FilterLabel>
          <div className="inline-flex border border-paper-edge rounded-sm overflow-hidden">
            <SegTab active={sort === 'popular'} onClick={() => setParam('sort', 'popular')}>
              热门
            </SegTab>
            <SegTab active={sort === 'latest'} onClick={() => setParam('sort', 'latest')}>
              最新
            </SegTab>
          </div>
        </div>
      </div>

      {/* —— 更多筛选（行业 / 工作内容），默认折叠 —— */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setMoreOpen(!moreOpen)}
          className="inline-flex items-center gap-1.5 font-sans text-xs text-sepia hover:text-ink-brown transition-colors"
        >
          <svg
            className={cn('transition-transform', moreOpen && 'rotate-90')}
            width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"
          >
            <path d="M3 1.5 L7 5 L3 8.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          更多筛选
          {hasMinorFilter && (
            <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-wax-red text-vellum rounded-full num-osf">
              {(industry ? 1 : 0) + contents.length}
            </span>
          )}
        </button>

        {moreOpen && (
          <div className="mt-3 pt-3 border-t border-paper-edge space-y-3">
            {/* 行业（单选） */}
            <div className="flex flex-wrap items-center gap-1.5">
              <FilterLabel>行业</FilterLabel>
              <PillChip active={industry === ''} onClick={() => setParam('industry', '')}>
                不限
              </PillChip>
              {INDUSTRY_TAGS.map((t) => (
                <PillChip key={t.value} active={industry === t.value} onClick={() => setParam('industry', t.value)}>
                  {t.label}
                </PillChip>
              ))}
            </div>

            {/* 工作内容（多选，最多3） */}
            <div className="flex flex-wrap items-center gap-1.5">
              <FilterLabel>工作内容{contents.length > 0 && `（${contents.length}/3）`}</FilterLabel>
              {CONTENT_TAGS.map((t) => {
                const active = contents.includes(t.value);
                return (
                  <FoldChip
                    key={t.value}
                    active={active}
                    disabled={!active && contents.length >= 3}
                    onClick={() => toggleContent(t.value)}
                  >
                    {t.label}
                  </FoldChip>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function toLibraryHref(params: URLSearchParams) {
  const query = params.toString();
  return query ? `/?${query}#skill-library` : '/#skill-library';
}

const TIME_OPTIONS = [
  { value: '7d', label: '近 7 天' },
  { value: '30d', label: '近 30 天' },
  { value: '90d', label: '近 90 天' },
] as const;

/* ============================================================
   局部小组件
   ============================================================ */
function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-display tracking-display text-[10px] text-sepia uppercase mr-0.5 select-none">
      {children}
    </span>
  );
}

function Divider() {
  return <span className="hidden md:inline-block w-px h-4 bg-paper-edge" />;
}

function SealChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
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

function BadgeChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
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

function TabChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-2.5 h-6 text-xs font-sans transition-colors border-b-2',
        active
          ? 'border-wax-red text-ink-brown'
          : 'border-transparent text-sepia hover:text-ink-brown',
      )}
    >
      {children}
    </button>
  );
}

function SegTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
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

function PillChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
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
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
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
