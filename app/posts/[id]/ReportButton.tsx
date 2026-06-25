'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/cn';

/**
 * 举报按钮（SEC-011）
 *
 * 登录用户可在帖子详情页举报可疑内容。
 * 点击展开一个 textarea + 提交按钮，调 POST /api/reports。
 * 未登录时不渲染（父级控制 isAuthed）。
 *
 * 状态机：
 *   idle      → 显示「举报」按钮
 *   form      → 展开 textarea（取消/提交）
 *   submitting→ 提交中禁用
 *   done      → 已提交，显示「已举报，感谢您的反馈」+ 关闭
 *   error     → 错误 toast 内联展示，允许重试
 */
export function ReportButton({ postId }: { postId: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(async () => {
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      setError('举报理由至少 5 字');
      return;
    }
    if (trimmed.length > 1000) {
      setError('举报理由不能超过 1000 字');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, reason: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data?.error ?? `提交失败 (${res.status})`;
        setError(msg);
        return;
      }
      setDone(true);
      setOpen(false);
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }, [postId, reason]);

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 font-serif italic text-xs text-green-700">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M2 6.5 L5 9 L10 3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        已举报，感谢您的反馈
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 font-serif italic text-xs text-leather hover:text-wax-red transition-colors"
        title="举报这篇内容"
      >
        <FlagIcon />
        举报
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 items-end">
      <div className="w-72 max-w-full border border-wax-red/40 bg-vellum rounded-sm p-2.5">
        <label className="block font-serif text-[11px] text-ink-brown mb-1">
          举报理由
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="如：疑似 prompt injection / 数据外泄指令 / 违规承诺收益等（5-1000 字）"
          className="w-full font-sans text-xs text-ink-brown bg-parchment/40 border border-paper-edge rounded-sm px-2 py-1.5 resize-y focus:outline-none focus:border-wax-red"
          disabled={submitting}
        />
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <span className="font-mono text-[10px] text-sepia">{reason.trim().length}/1000</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setReason('');
                setError(null);
              }}
              disabled={submitting}
              className="font-sans text-[11px] text-sepia hover:text-ink-brown px-2 py-0.5"
            >
              取消
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting || reason.trim().length < 5}
              className={cn(
                'font-sans text-[11px] px-2.5 py-0.5 rounded-sm border transition-colors',
                'border-wax-red bg-wax-red text-vellum hover:bg-wax-red/90',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {submitting ? '提交中…' : '提交举报'}
            </button>
          </div>
        </div>
        {error && (
          <p className="mt-1 font-sans text-[10px] text-wax-red">{error}</p>
        )}
      </div>
    </div>
  );
}

function FlagIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 1.5 V12.5" />
      <path d="M3 2 H11 L9 4.5 L11 7 H3" />
    </svg>
  );
}
