'use client';

import { useRouter } from 'next/navigation';

/**
 * 返回按钮：优先用浏览器后退（保留筛选状态），没有历史则回首页。
 */
export function BackLink() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push('/');
      }}
      className="inline-flex items-center gap-1.5 font-serif italic text-sm text-sepia hover:text-ink-brown transition-colors"
    >
      ← 返回
    </button>
  );
}
