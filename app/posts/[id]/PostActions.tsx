'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { formatCount } from '@/lib/format';

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
  return (
    <div className="pointer-events-none sticky bottom-6 z-10 flex justify-center">
      <div className="pointer-events-auto inline-flex items-center gap-1 border border-paper-edge bg-vellum rounded-md p-1 backdrop-blur-[2px]">
        <PostStarButton
          postId={postId}
          initialStarred={initialStarred}
          initialStars={initialStars}
          isAuthed={isAuthed}
          variant="bar"
        />
      </div>
    </div>
  );
}

export function PostStarButton({
  postId,
  initialStarred,
  initialStars,
  isAuthed,
  variant = 'bar',
}: {
  postId: number;
  initialStarred: boolean;
  initialStars: number;
  isAuthed: boolean;
  variant?: 'bar' | 'title';
}) {
  const router = useRouter();
  const [starred, setStarred] = useState(initialStarred);
  const [stars, setStars] = useState(initialStars);

  useEffect(() => {
    const syncStar = (event: Event) => {
      const detail = (event as CustomEvent<{ postId: number; starred: boolean; stars: number }>).detail;
      if (!detail || detail.postId !== postId) return;
      setStarred(detail.starred);
      setStars(detail.stars);
    };

    window.addEventListener('nei:post-star', syncStar);
    return () => window.removeEventListener('nei:post-star', syncStar);
  }, [postId]);

  const onStar = async () => {
    if (!isAuthed) {
      router.push(`/login?next=/posts/${postId}`);
      return;
    }

    const next = !starred;
    const nextStars = stars + (next ? 1 : -1);
    setStarred(next);
    setStars(nextStars);
    emitStarSync(postId, next, nextStars);

    const res = await fetch(`/api/posts/${postId}/favorite`, { method: 'POST' });
    if (!res.ok) {
      setStarred(!next);
      setStars(stars);
      emitStarSync(postId, !next, stars);
    }
  };

  return (
    <button
      type="button"
      onClick={onStar}
      className={cn(
        'inline-flex items-center gap-2 rounded-sm transition-colors',
        variant === 'title'
          ? 'h-10 border border-paper-edge bg-vellum px-3 font-sans text-xs hover:border-ink-brown'
          : 'h-9 px-4',
        starred ? 'text-gilded' : 'text-leather hover:text-ink-brown',
      )}
      aria-pressed={starred}
      title={starred ? '取消 Star' : 'Star'}
    >
      <StarIcon filled={starred} />
      <span className="font-serif num-osf">{formatCount(stars)}</span>
      <span className={cn('font-sans text-xs', variant === 'title' ? 'hidden sm:inline' : 'text-sepia ml-0.5')}>
        {starred ? '已 Star' : 'Star'}
      </span>
    </button>
  );
}

function emitStarSync(postId: number, starred: boolean, stars: number) {
  window.dispatchEvent(new CustomEvent('nei:post-star', { detail: { postId, starred, stars } }));
}

function StarIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M8 1.5 L10.2 5.5 L14.5 6.3 L11.5 9.5 L12.2 14 L8 11.8 L3.8 14 L4.5 9.5 L1.5 6.3 L5.8 5.5 Z" strokeLinejoin="round" />
    </svg>
  );
}
