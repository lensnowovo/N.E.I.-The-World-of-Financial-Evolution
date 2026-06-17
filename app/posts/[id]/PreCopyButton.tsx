'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * Prompt 正文区右上角的「就地复制」按钮。
 *
 * 浮在提示词帖正文（<pre> 块）的右上角。看到 Prompt 原文时就地能复制，
 * 不用滚回顶部找主操作区的复制按钮。
 *
 * - 未登录 → 跳登录页（跟主操作区复制按钮行为一致）
 * - 已登录 → 复制 <pre> 内容，显示「已复制」反馈
 *
 * 只有 body 里含 <pre> 时才渲染（由父组件控制）。
 */
export function PreCopyButton({
  bodyHtml,
  postId,
  isAuthed,
}: {
  bodyHtml: string;
  postId: number;
  isAuthed: boolean;
}) {
  const [copied, setCopied] = useState(false);

  // 没有 <pre> 就不渲染
  if (!/<pre[\s>]/i.test(bodyHtml)) return null;

  const handleCopy = async () => {
    // 复制免费开放：不要求登录。
    const preMatch = bodyHtml.match(/<pre[\s\S]*?>([\s\S]*?)<\/pre>/i);
    const raw = preMatch ? preMatch[1] : bodyHtml;
    const text = raw
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .trim();

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'absolute top-2 right-2 z-10 inline-flex items-center gap-1.5 h-7 px-2.5',
        'text-[11px] font-sans rounded-sm border backdrop-blur-[1px] transition-colors',
        copied
          ? 'border-emerald-600 text-emerald-700 bg-emerald-50/90'
          : 'border-paper-edge bg-vellum/80 text-leather hover:text-ink-brown hover:border-ink-brown',
      )}
      title="复制 Prompt"
    >
      {copied ? (
        <>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M2 6.5 L5 9.5 L10 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          已复制
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
            <rect x="3.5" y="3.5" width="6" height="6" rx="0.5" />
            <path d="M2 7.5 V2 H7.5" strokeLinecap="round" />
          </svg>
          复制
        </>
      )}
    </button>
  );
}
