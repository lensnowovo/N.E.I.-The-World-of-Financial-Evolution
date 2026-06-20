'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExecuteDialog } from './ExecuteDialog';

/**
 * 执行按钮 + 弹窗状态管理。
 * 仅 prompt 类型显示。未登录跳登录，未配 key 跳设置。
 */
export function ExecuteButton({
  postId,
  isAuthed,
  hasApiKey,
}: {
  postId: number;
  isAuthed: boolean;
  hasApiKey: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    if (!isAuthed) {
      router.push(`/login?next=/posts/${postId}`);
      return;
    }
    if (!hasApiKey) {
      router.push('/settings');
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-2 h-10 px-5 border border-gilded text-ink-brown hover:bg-gilded hover:text-vellum font-serif text-sm rounded-sm transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
          <path d="M4 2 L12 8 L4 14 Z" strokeLinejoin="round" />
        </svg>
        执行
      </button>
      {open && <ExecuteDialog postId={postId} onClose={() => setOpen(false)} />}
    </>
  );
}
