'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { formatCount } from '@/lib/format';

/**
 * 浮动互动条 —— Star（收藏+点赞合并）
 * 点 Star = 收藏到控制台 + 表示认可
 */
export function PostActions({
  postId,
  initialStarred,
  initialStars,
  isAuthed,
}: {
  postId: number;
  initialStarred: boolean;
  initialStars: number;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [starred, setStarred] = useState(initialStarred);
  const [stars, setStars] = useState(initialStars);

  const requireAuth = () => {
    if (!isAuthed) {
      router.push(`/login?next=/posts/${postId}`);
      return false;
    }
    return true;
  };

  const onStar = async () => {
    if (!requireAuth()) return;
    const next = !starred;
    setStarred(next);
    setStars((n) => n + (next ? 1 : -1));
    const res = await fetch(`/api/posts/${postId}/favorite`, { method: 'POST' });
    if (!res.ok) {
      setStarred(!next);
      setStars((n) => n + (next ? -1 : 1));
    }
  };

  return (
    <div className="pointer-events-none sticky bottom-6 z-10 flex justify-center">
      <div className="pointer-events-auto inline-flex items-center gap-1 border border-paper-edge bg-vellum rounded-md p-1 backdrop-blur-[2px]">
        <button
          onClick={onStar}
          className={cn(
            'inline-flex items-center gap-2 h-9 px-4 rounded-sm transition-colors',
            starred ? 'text-gilded' : 'text-leather hover:text-ink-brown',
          )}
        >
          <StarIcon filled={starred} />
          <span className="font-serif num-osf">{formatCount(stars)}</span>
          <span className="font-sans text-xs text-sepia ml-0.5">{starred ? '已 Star' : 'Star'}</span>
        </button>
      </div>
    </div>
  );
}

function StarIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M8 1.5 L10.2 5.5 L14.5 6.3 L11.5 9.5 L12.2 14 L8 11.8 L3.8 14 L4.5 9.5 L1.5 6.3 L5.8 5.5 Z" strokeLinejoin="round" />
    </svg>
  );
}
