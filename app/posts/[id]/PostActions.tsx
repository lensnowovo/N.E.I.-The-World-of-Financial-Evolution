'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { formatCount } from '@/lib/format';

/**
 * 浮动互动条 —— 详情页底部居中
 * 棕墨水实底盒子，内嵌两个操作（点赞 / 收藏）
 * 圆角 2px，1px paper-edge 描边，不上抬，不阴影
 */
export function PostActions({
  postId,
  initialLiked,
  initialFavorited,
  initialLikes,
  isAuthed,
}: {
  postId: number;
  initialLiked: boolean;
  initialFavorited: boolean;
  initialLikes: number;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [likes, setLikes] = useState(initialLikes);
  const [fav, setFav] = useState(initialFavorited);

  const requireAuth = () => {
    if (!isAuthed) {
      router.push(`/login?next=/posts/${postId}`);
      return false;
    }
    return true;
  };

  const onLike = async () => {
    if (!requireAuth()) return;
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    const res = await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
    if (!res.ok) {
      setLiked(!next);
      setLikes((n) => n + (next ? -1 : 1));
    } else {
      const d = await res.json();
      if (typeof d.count === 'number') setLikes(d.count);
    }
  };

  const onFav = async () => {
    if (!requireAuth()) return;
    const next = !fav;
    setFav(next);
    const res = await fetch(`/api/posts/${postId}/favorite`, { method: 'POST' });
    if (!res.ok) setFav(!next);
  };

  return (
    <div className="pointer-events-none sticky bottom-6 z-10 flex justify-center">
      <div className="pointer-events-auto inline-flex items-center gap-1 border border-paper-edge bg-vellum rounded-md p-1 backdrop-blur-[2px]">
        <ActionBtn
          onClick={onLike}
          active={liked}
          activeClass="text-wax-red"
          label={
            <>
              <HeartIcon filled={liked} />
              <span className="font-serif num-osf">{formatCount(likes)}</span>
              <span className="font-sans text-xs text-sepia ml-0.5">赞</span>
            </>
          }
        />
        <span className="w-px h-5 bg-paper-edge" />
        <ActionBtn
          onClick={onFav}
          active={fav}
          activeClass="text-gilded"
          label={
            <>
              <BookmarkIcon filled={fav} />
              <span className="font-serif italic text-sm">
                {fav ? '已收藏' : '收藏'}
              </span>
            </>
          }
        />
      </div>
    </div>
  );
}

function ActionBtn({
  onClick,
  active,
  activeClass,
  label,
}: {
  onClick: () => void;
  active: boolean;
  activeClass: string;
  label: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 h-9 px-4 rounded-sm transition-colors',
        active ? activeClass : 'text-leather hover:text-ink-brown',
      )}
    >
      {label}
    </button>
  );
}

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M8 14 C4 11, 1.5 8.5, 1.5 6 C1.5 4, 3 2.5, 5 2.5 C6.5 2.5, 7.5 3.3, 8 4.5 C8.5 3.3, 9.5 2.5, 11 2.5 C13 2.5, 14.5 4, 14.5 6 C14.5 8.5, 12 11, 8 14 Z" />
    </svg>
  );
}
function BookmarkIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M4 2.5 H12 V14 L8 11 L4 14 Z" strokeLinejoin="round" />
    </svg>
  );
}
