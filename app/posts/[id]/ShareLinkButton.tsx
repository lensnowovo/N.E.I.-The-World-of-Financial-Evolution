'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';

type ShareLinkButtonProps = {
  title: string;
  description?: string | null;
  url?: string;
  scene?: string | null;
  assetLabel?: string | null;
};

export function ShareLinkButton({
  title,
  description,
  url,
  scene,
  assetLabel,
}: ShareLinkButtonProps) {
  const [state, setState] = useState<'idle' | 'shared' | 'copied' | 'wechat'>('idle');

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  const shareSkill = async () => {
    const shareUrl = url || window.location.href;
    const meta = [scene, assetLabel].filter(Boolean).join(' / ');
    const shareTitle = `${title} | N.E.I.`;
    const shareText = [description, meta ? `场景：${meta}` : null]
      .filter(Boolean)
      .join('\n');
    const wechatText = [
      `【N.E.I. Skill】${title}`,
      description,
      meta ? `场景：${meta}` : null,
      shareUrl,
    ]
      .filter(Boolean)
      .join('\n');
    const isWeChat =
      typeof navigator !== 'undefined' && /MicroMessenger/i.test(navigator.userAgent);

    if (isWeChat) {
      await copyText(wechatText);
      setState('wechat');
      setTimeout(() => setState('idle'), 3200);
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText || '来自 N.E.I. 的一级市场 Skill / Workflow',
          url: shareUrl,
        });
        setState('shared');
        setTimeout(() => setState('idle'), 2000);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    await copyText(wechatText);
    setState('copied');
    setTimeout(() => setState('idle'), 2400);
  };

  return (
    <button
      type="button"
      onClick={shareSkill}
      title="复制适合粘贴到微信的标题、摘要和链接；移动端会优先打开系统分享"
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-sm border px-3 font-sans text-xs transition-colors',
        state !== 'idle'
          ? 'border-moss/40 bg-moss/5 text-moss'
          : 'border-paper-edge text-leather hover:border-ink-brown hover:text-ink-brown',
      )}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
        <path d="M6.5 5 L9.5 3 A3 3 0 0 1 13.5 7 L11.5 9" strokeLinecap="round" />
        <path d="M9.5 11 L6.5 13 A3 3 0 0 1 2.5 9 L4.5 7" strokeLinecap="round" />
        <path d="M6 9.5 L10 6.5" strokeLinecap="round" />
      </svg>
      {state === 'shared'
        ? '已打开分享'
        : state === 'wechat'
          ? '已复制，点右上角分享'
          : state === 'copied'
            ? '已复制微信文案'
            : '微信分享'}
    </button>
  );
}
