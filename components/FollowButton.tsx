'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';

/**
 * FollowButton · 关注 / 已关注 toggle
 * 已关注：实底深棕 + "已结盟"（衬线）
 * 未关注：透明描边 + "结盟" 字号同
 * hover 时已关注的按钮会变成"解盟"红字提示
 */
export function FollowButton({
  userId,
  initialFollowing,
  isAuthed,
}: {
  userId: number;
  initialFollowing: boolean;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [hover, setHover] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onClick = async () => {
    if (!isAuthed) {
      router.push(`/login?next=/profile/${userId}`);
      return;
    }
    const next = !following;
    setFollowing(next);
    setSubmitting(true);
    const res = await fetch(`/api/users/${userId}/follow`, { method: 'POST' });
    setSubmitting(false);
    if (!res.ok) {
      setFollowing(!next);
      return;
    }
    router.refresh();
  };

  if (!following) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={submitting}
        className={cn(
          'inline-flex items-center gap-1.5 h-8 px-4 rounded-sm',
          'border border-ink-brown bg-transparent text-ink-brown',
          'font-serif text-sm',
          'hover:bg-ink-brown hover:text-vellum transition-colors',
          'disabled:opacity-60',
        )}
      >
        <PlusIcon />
        <span>关注</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={submitting}
      className={cn(
        'inline-flex items-center gap-1.5 h-8 px-4 rounded-sm',
        'border font-serif text-sm transition-colors',
        hover
          ? 'border-wax-red bg-transparent text-wax-red'
          : 'border-ink-brown bg-ink-brown text-vellum',
        'disabled:opacity-60',
      )}
    >
      {hover ? <CrossIcon /> : <CheckIcon />}
      <span>{hover ? '取消关注' : '已关注'}</span>
    </button>
  );
}

function PlusIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M6 2 V10 M2 6 H10" strokeLinecap="round" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 6.5 L5 9 L9.5 3.5" />
    </svg>
  );
}
function CrossIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
      <path d="M3 3 L9 9 M9 3 L3 9" />
    </svg>
  );
}
