'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';

export function ShareLinkButton() {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={copyLink}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-sm border px-3 font-sans text-xs transition-colors',
        copied
          ? 'border-moss/40 bg-moss/5 text-moss'
          : 'border-paper-edge text-leather hover:border-ink-brown hover:text-ink-brown',
      )}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
        <path d="M6.5 5 L9.5 3 A3 3 0 0 1 13.5 7 L11.5 9" strokeLinecap="round" />
        <path d="M9.5 11 L6.5 13 A3 3 0 0 1 2.5 9 L4.5 7" strokeLinecap="round" />
        <path d="M6 9.5 L10 6.5" strokeLinecap="round" />
      </svg>
      {copied ? '链接已复制' : '复制链接'}
    </button>
  );
}
