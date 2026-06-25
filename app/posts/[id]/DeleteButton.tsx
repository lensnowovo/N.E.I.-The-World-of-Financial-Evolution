'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 详情页「删除」按钮（作者本人或管理员可见）。
 * 调 DELETE /api/posts/[id] 软删除，成功后跳回首页。
 */
export function DeleteButton({ postId, isAdmin }: { postId: number; isAdmin?: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState('');
  const router = useRouter();

  const doDelete = async () => {
    setErr('');
    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErr(data?.error || '删除失败');
        setDeleting(false);
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setErr('网络错误');
      setDeleting(false);
    }
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1 font-serif italic text-xs text-leather hover:text-wax-red transition-colors"
        title={isAdmin ? '管理员删除' : '删除这篇内容'}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
          <path d="M2 3h8M4.5 3V2h3v1M3.5 3l.5 7h4l.5-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        删除
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-sans text-[11px] text-wax-red">确认删除？</span>
      <button
        type="button"
        onClick={doDelete}
        disabled={deleting}
        className="font-sans text-[11px] text-wax-red hover:underline disabled:opacity-50"
      >
        {deleting ? '删除中…' : '是，删除'}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="font-sans text-[11px] text-sepia hover:text-ink-brown"
      >
        取消
      </button>
      {err && <span className="font-sans text-[10px] text-wax-red">{err}</span>}
    </span>
  );
}
