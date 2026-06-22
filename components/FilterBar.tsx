'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/cn';
import {
  SCENE_TAGS,
  INDUSTRY_TAGS,
  CONTENT_TAGS,
  SKILL_TAGS,
  sceneLabel,
  industryLabel,
  contentLabel,
  skillLabel,
} from '@/lib/tags';
import { RoleBadge } from '@/components/icons/RoleBadge';

const TIME_OPTIONS = [
  { value: '', label: '全部时间' },
  { value: '7d', label: '近 7 日' },
  { value: '30d', label: '近 30 日' },
  { value: '90d', label: '近 90 日' },
];

/**
 * FilterBar · 卷宗目录索引
 *
 * 默认折叠：只显示一行当前筛选摘要 + 「展开筛选」按钮
 * 展开后：四维 Chip 行 + 身份 + 时间，按罗马数字编排
 *
 * 视觉原则：
 *   - 不用 select 下拉（太 SaaS），全部用 Chip 平铺
 *   - 用罗马数字 + 衬线小字做小标题（章节感）
 *   - 多余的"清空"按钮放右上，纯文字
 */
export function FilterBar() {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const basePath = pathname === '/search' ? '/search' : '/';

  const scene = params.get('scene') || '';
  const industry = params.get('industry') || '';
  const skill = params.get('skill') || '';
  const role = params.get('role') || '';
  const time = params.get('time') || '';
  const contents = params.getAll('content');
  const q = params.get('q') || '';

  const [expanded, setExpanded] = useState(false);

  const setParam = useCallback(
    (key: string, value: string) => {
      const u = new URLSearchParams(params.toString());
      if (value) u.set(key, value);
      else u.delete(key);
      router.push(`${basePath}?${u.toString()}`);
    },
    [basePath, params, router],
  );

  const toggleContent = useCallback(
    (v: string) => {
      const u = new URLSearchParams(params.toString());
      const current = u.getAll('content');
      u.delete('content');
      let next: string[];
      if (current.includes(v)) next = current.filter((x) => x !== v);
      else {
        if (current.length >= 3) return;
        next = [...current, v];
      }
      next.forEach((x) => u.append('content', x));
      router.push(`${basePath}?${u.toString()}`);
    },
    [basePath, params, router],
  );

  const reset = () => router.push(basePath);

  /** 当前已选摘要 —— 用于折叠态展示 */
  const summary = useMemo(() => {
    const parts: { key: string; label: string; clear: () => void }[] = [];
    if (scene) parts.push({ key: `scene-${scene}`, label: sceneLabel(scene), clear: () => setParam('scene', '') });
    if (industry) parts.push({ key: `ind-${industry}`, label: industryLabel(industry), clear: () => setParam('industry', '') });
    contents.forEach((c) =>
      parts.push({ key: `con-${c}`, label: contentLabel(c), clear: () => toggleContent(c) }),
    );
    if (skill) parts.push({ key: `skill-${skill}`, label: skillLabel(skill), clear: () => setParam('skill', '') });
    if (role) parts.push({ key: `role-${role}`, label: `${role} 发布`, clear: () => setParam('role', '') });
    if (time) {
      const t = TIME_OPTIONS.find((o) => o.value === time);
      if (t) parts.push({ key: `time-${time}`, label: t.label, clear: () => setParam('time', '') });
    }
    return parts;
  }, [scene, industry, contents, skill, role, time, setParam, toggleContent]);

  const hasFilter = summary.length > 0 || q;

  return (
    <section className="border border-paper-edge bg-vellum rounded-md">
      {/* —— 折叠态：摘要行 —— */}
      <div className="flex items-center gap-3 px-5 py-3.5">
        <span className="font-display tracking-display text-[10px] text-sepia uppercase">
          Filter
        </span>
        <span className="h-3 w-px bg-paper-edge" />

        {summary.length === 0 && !q ? (
          <span className="font-serif italic text-sm text-sepia">
            未设筛选 · 显示全部
          </span>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {q && (
              <SummaryPill onClear={() => setParam('q', '')}>
                <span className="font-serif italic">“{q}”</span>
              </SummaryPill>
            )}
            {summary.map((s) => (
              <SummaryPill key={s.key} onClear={s.clear}>
                {s.label}
              </SummaryPill>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-4 font-sans text-xs">
          {hasFilter && (
            <button
              onClick={reset}
              className="text-sepia hover:text-wax-red transition-colors"
            >
              清空
            </button>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-leather hover:text-ink-brown transition-colors inline-flex items-center gap-1"
          >
            {expanded ? '收起' : '展开筛选'}
            <Caret open={expanded} />
          </button>
        </div>
      </div>

      {/* —— 展开态：四维 + 身份 + 时间 —— */}
      {expanded && (
        <div className="border-t border-paper-edge px-5 py-5 space-y-5">
          <FilterRow numeral="I" title="工作场景" hint="单选">
            <ChipSet>
              <FilterChip
                shape="seal"
                active={scene === ''}
                onClick={() => setParam('scene', '')}
              >
                全部
              </FilterChip>
              {SCENE_TAGS.map((t) => (
                <FilterChip
                  key={t.value}
                  shape="seal"
                  active={scene === t.value}
                  onClick={() => setParam('scene', t.value)}
                >
                  {t.label}
                </FilterChip>
              ))}
            </ChipSet>
          </FilterRow>

          <FilterRow numeral="II" title="行业赛道" hint="单选">
            <ChipSet>
              <FilterChip
                shape="pill"
                active={industry === ''}
                onClick={() => setParam('industry', '')}
              >
                全部
              </FilterChip>
              {INDUSTRY_TAGS.map((t) => (
                <FilterChip
                  key={t.value}
                  shape="pill"
                  active={industry === t.value}
                  onClick={() => setParam('industry', t.value)}
                >
                  {t.label}
                </FilterChip>
              ))}
            </ChipSet>
          </FilterRow>

          <FilterRow numeral="III" title="工作内容" hint={`多选 · 最多 3 个 · 已选 ${contents.length}`}>
            <ChipSet>
              {CONTENT_TAGS.map((t) => (
                <FilterChip
                  key={t.value}
                  shape="fold"
                  active={contents.includes(t.value)}
                  onClick={() => toggleContent(t.value)}
                  disabled={!contents.includes(t.value) && contents.length >= 3}
                >
                  {t.label}
                </FilterChip>
              ))}
            </ChipSet>
          </FilterRow>

          <FilterRow numeral="IV" title="Skill 类型" hint="单选">
            <ChipSet>
              <FilterChip
                shape="badge"
                active={skill === ''}
                onClick={() => setParam('skill', '')}
              >
                全部
              </FilterChip>
              {SKILL_TAGS.map((t) => (
                <FilterChip
                  key={t.value}
                  shape="badge"
                  active={skill === t.value}
                  onClick={() => setParam('skill', t.value)}
                >
                  {t.label}
                </FilterChip>
              ))}
            </ChipSet>
          </FilterRow>

          {/* —— 发布者身份 + 时间 同行 —— */}
          <div className="pt-5 border-t border-paper-edge grid sm:grid-cols-2 gap-6">
            <FilterRow numeral="V" title="发布者身份">
              <div className="flex items-center gap-1">
                <RoleTab active={role === ''} onClick={() => setParam('role', '')}>
                  全部
                </RoleTab>
                {(['VC', 'PE', 'FA'] as const).map((r) => (
                  <RoleTab
                    key={r}
                    active={role === r}
                    onClick={() => setParam('role', r)}
                  >
                    <RoleBadge role={r} size={14} />
                    {r}
                  </RoleTab>
                ))}
              </div>
            </FilterRow>

            <FilterRow numeral="VI" title="时间范围">
              <div className="flex items-center gap-1">
                {TIME_OPTIONS.map((o) => (
                  <RoleTab
                    key={o.value}
                    active={time === o.value}
                    onClick={() => setParam('time', o.value)}
                  >
                    {o.label}
                  </RoleTab>
                ))}
              </div>
            </FilterRow>
          </div>
        </div>
      )}
    </section>
  );
}

/* ============================================================
   局部组件
   ============================================================ */
function FilterRow({
  numeral,
  title,
  hint,
  children,
}: {
  numeral: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-2.5">
        <span className="font-display tracking-display text-[11px] text-sepia">
          {numeral}
        </span>
        <span className="font-serif text-sm text-ink-brown">{title}</span>
        {hint && (
          <span className="font-sans text-[10px] text-sepia tracking-wide">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function ChipSet({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}

type Shape = 'seal' | 'pill' | 'fold' | 'badge';

function FilterChip({
  shape,
  active,
  disabled,
  onClick,
  children,
}: {
  shape: Shape;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const base =
    'inline-flex items-center px-2.5 h-6 text-xs font-sans transition-colors duration-150';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        base,
        shape === 'seal' &&
          (active
            ? 'border border-ink-brown bg-ink-brown text-vellum font-serif tracking-wide uppercase'
            : 'border border-paper-edge text-leather hover:border-ink-brown hover:text-ink-brown font-serif tracking-wide uppercase'),
        shape === 'pill' &&
          (active
            ? 'rounded-full bg-leather text-vellum'
            : 'rounded-full bg-linen text-leather hover:bg-paper-edge'),
        shape === 'fold' &&
          (active
            ? 'border border-ink-brown bg-parchment text-ink-brown'
            : 'border border-paper-edge bg-parchment text-leather hover:border-sepia'),
        shape === 'badge' &&
          (active
            ? 'rounded-full bg-gilded/15 border border-gilded text-ink-brown'
            : 'rounded-full bg-vellum border border-gilded/40 text-leather hover:border-gilded'),
        disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      {children}
    </button>
  );
}

function RoleTab({
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
        'inline-flex items-center gap-1.5 px-3 py-1.5 font-sans text-xs transition-colors',
        active
          ? 'text-ink-brown border-b border-ink-brown'
          : 'text-sepia border-b border-transparent hover:text-leather',
      )}
    >
      {children}
    </button>
  );
}

function SummaryPill({
  onClear,
  children,
}: {
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 h-6 px-2 border border-paper-edge bg-parchment text-xs font-sans text-ink-brown">
      {children}
      <button
        onClick={onClear}
        type="button"
        className="ml-1 text-sepia hover:text-wax-red"
        aria-label="移除筛选"
      >
        <svg width="9" height="9" viewBox="0 0 9 9" stroke="currentColor" strokeWidth="1.2">
          <path d="M1 1 L8 8 M8 1 L1 8" />
        </svg>
      </button>
    </span>
  );
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      className={cn('transition-transform duration-150', open && 'rotate-180')}
      aria-hidden="true"
    >
      <path d="M2 3.5 L5 6.5 L8 3.5" />
    </svg>
  );
}
