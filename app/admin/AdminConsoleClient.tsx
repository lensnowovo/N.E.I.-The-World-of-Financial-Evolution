'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { sceneLabel } from '@/lib/tags';
import { POST_STATUS } from '@/lib/status';

export type AdminPostItem = {
  id: number;
  title: string;
  status: string;
  tagScene: string;
  featured: boolean;
  deletedAt: string | null;
  createdAt: string;
  author: { id: number; nickname: string };
};

type ActionState = { ok: boolean; text: string } | null;

const STATUS_LABEL: Record<string, string> = {
  [POST_STATUS.DRAFT]: '草稿',
  [POST_STATUS.PENDING]: '待审',
  [POST_STATUS.PUBLISHED]: '已发布',
  [POST_STATUS.REJECTED]: '已拒绝',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminConsoleClient({
  initialItems,
  adminId,
}: {
  initialItems: AdminPostItem[];
  adminId: number;
}) {
  const [items, setItems] = useState<AdminPostItem[]>(initialItems);
  const [showDeleted, setShowDeleted] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState<ActionState>(null);

  const visible = items.filter((i) => (showDeleted ? true : !i.deletedAt));

  const flash = useCallback((ok: boolean, text: string) => {
    setToast({ ok, text });
    window.setTimeout(() => setToast(null), 2500);
  }, []);

  // 软删除：调用 US-011 的 DELETE /api/posts/[id]
  const onDelete = useCallback(
    async (post: AdminPostItem) => {
      if (post.deletedAt) return; // 已软删不重复操作
      if (typeof window !== 'undefined' && !window.confirm(`确认软删「${post.title}」？`)) return;
      setBusyId(post.id);
      try {
        const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          flash(false, `删除失败：${data?.error ?? res.status}`);
          return;
        }
        const now = new Date().toISOString();
        setItems((prev) => prev.map((i) => (i.id === post.id ? { ...i, deletedAt: now } : i)));
        flash(true, `已软删「${post.title}」`);
      } catch {
        flash(false, '网络错误，删除失败');
      } finally {
        setBusyId(null);
      }
    },
    [flash],
  );

  // 切换精选：调用 US-012 的 PATCH /api/admin/posts/[id]/feature
  const onToggleFeatured = useCallback(
    async (post: AdminPostItem) => {
      setBusyId(post.id);
      const next = !post.featured;
      try {
        const res = await fetch(`/api/admin/posts/${post.id}/feature`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ featured: next }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          flash(false, `操作失败：${data?.error ?? res.status}`);
          return;
        }
        setItems((prev) => prev.map((i) => (i.id === post.id ? { ...i, featured: next } : i)));
        flash(true, next ? `已精选「${post.title}」` : `已取消精选「${post.title}」`);
      } catch {
        flash(false, '网络错误，操作失败');
      } finally {
        setBusyId(null);
      }
    },
    [flash],
  );

  return (
    <div className="space-y-4">
      {/* 工具条 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <label className="inline-flex items-center gap-2 font-sans text-sm text-leather cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
            className="h-4 w-4 accent-ink-brown"
          />
          显示已软删帖子
        </label>
        {toast && (
          <span
            className={`font-sans text-xs px-2 py-1 rounded-sm ${
              toast.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {toast.text}
          </span>
        )}
      </div>

      {/* 列表 */}
      {visible.length === 0 ? (
        <div className="border border-paper-edge bg-vellum rounded-md p-10 text-center">
          <p className="font-serif italic text-sepia">
            {showDeleted ? '暂无帖子（含软删）' : '暂无活跃帖子'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((p) => {
            const isBusy = busyId === p.id;
            const deleted = !!p.deletedAt;
            return (
              <li
                key={p.id}
                className={`border border-paper-edge bg-vellum rounded-md p-4 ${
                  deleted ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/posts/${p.id}`}
                        className="font-serif text-lg text-ink-brown hover:text-wax-red truncate"
                      >
                        {p.title}
                      </Link>
                      {p.featured && (
                        <span className="font-sans text-[10px] px-1.5 py-0.5 bg-ink-brown text-vellum rounded-sm">
                          精选
                        </span>
                      )}
                      {deleted && (
                        <span className="font-sans text-[10px] px-1.5 py-0.5 border border-wax-red text-wax-red rounded-sm">
                          已软删
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 flex-wrap font-mono text-[11px] text-sepia">
                      <span>#{p.id}</span>
                      <span>{STATUS_LABEL[p.status] ?? p.status}</span>
                      <span>{sceneLabel(p.tagScene)}</span>
                      <Link
                        href={`/profile/${p.author.id}`}
                        className="hover:text-ink-brown"
                      >
                        @{p.author.nickname}
                      </Link>
                      <span>{formatDate(p.createdAt)}</span>
                      {deleted && p.deletedAt && (
                        <span className="text-wax-red">删除于 {formatDate(p.deletedAt)}</span>
                      )}
                      {p.author.id === adminId && <span className="text-sepia italic">（你的帖子）</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant={p.featured ? 'secondary' : 'primary'}
                      disabled={isBusy || deleted}
                      onClick={() => onToggleFeatured(p)}
                      title={deleted ? '已软删的帖子不可精选（公开视图不展示）' : ''}
                    >
                      {p.featured ? '取消精选' : '精选'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isBusy || deleted}
                      onClick={() => onDelete(p)}
                      title={deleted ? '已软删' : ''}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
