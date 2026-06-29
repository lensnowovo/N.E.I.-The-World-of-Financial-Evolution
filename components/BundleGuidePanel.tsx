'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

/**
 * Bundle 页面顶部的使用引导面板。
 * 告诉用户：怎么用这个工作流（收藏 → 配 MCP → 在 AI 里调用）+ 一键收藏 + 产出物。
 */
export function BundleGuidePanel({
  slug,
  output,
  isAuthed,
}: {
  slug: string;
  output: string;
  isAuthed: boolean;
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');

  const favoriteAll = async () => {
    if (!isAuthed) {
      window.location.href = `/login?next=/bundles/${slug}`;
      return;
    }
    setState('loading');
    try {
      const res = await fetch('/api/bundles/favorite-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      if (res.ok) {
        setState('done');
        setTimeout(() => setState('idle'), 3000);
      } else {
        setState('idle');
      }
    } catch {
      setState('idle');
    }
  };

  return (
    <div className="mb-8 rounded-lg border border-gilded/40 bg-gilded/5 p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-3">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-gilded" aria-hidden="true">
          <path d="M8 1.5 a6.5 6.5 0 0 1 0 13 a6.5 6.5 0 0 1 0 -13 Z" />
          <path d="M8 5 V8.5" strokeLinecap="round" />
          <circle cx="8" cy="11" r="0.5" fill="currentColor" />
        </svg>
        <p className="font-display tracking-display text-[10px] uppercase text-gilded">怎么用这个工作流</p>
      </div>

      <ol className="space-y-2.5">
        <li className="flex gap-3">
          <span className="font-mono text-xs text-wax-red shrink-0 mt-0.5">01</span>
          <p className="font-sans text-sm leading-6 text-leather">
            <strong className="text-ink-brown">收藏</strong>下面每一步用到的 Skill（或一键收藏全部）
          </p>
        </li>
        <li className="flex gap-3">
          <span className="font-mono text-xs text-wax-red shrink-0 mt-0.5">02</span>
          <p className="font-sans text-sm leading-6 text-leather">
            在 <strong className="text-ink-brown">Claude Code / Codex / Workbuddy</strong> 等 Agent 客户端配置 N.E.I. MCP Server
          </p>
        </li>
        <li className="flex gap-3">
          <span className="font-mono text-xs text-wax-red shrink-0 mt-0.5">03</span>
          <p className="font-sans text-sm leading-6 text-leather">
            把你的材料发给 AI，它会<strong className="text-ink-brown">自动调用</strong>收藏的 Skill 完成分析
          </p>
        </li>
      </ol>

      <div className="mt-4 pt-4 border-t border-gilded/20 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={favoriteAll}
          disabled={state === 'loading'}
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-sm px-4 font-serif text-sm transition-colors',
            state === 'done'
              ? 'bg-moss/10 border border-moss/40 text-moss'
              : 'bg-ink-brown text-vellum hover:bg-wax-red',
            state === 'loading' && 'opacity-60',
          )}
        >
          {state === 'done' ? '✓ 已收藏全部 Skill' : state === 'loading' ? '收藏中…' : '⭐ 一键收藏全部 Skill'}
        </button>
        <Link
          href="/connect"
          className="inline-flex h-9 items-center rounded-sm border border-paper-edge px-4 font-serif text-sm text-leather transition-colors hover:border-ink-brown hover:text-ink-brown"
        >
          配置 MCP →
        </Link>
      </div>

      <div className="mt-3 flex items-center gap-2 font-sans text-xs text-sepia">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
          <path d="M2 4 L6 8 L10 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>产出物：<strong className="text-leather">{output}</strong></span>
      </div>
    </div>
  );
}
