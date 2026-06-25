'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { StatCard, BarList } from '@/components/admin/charts';
import { MetricsView } from '@/components/admin/MetricsView';
import { sceneLabel } from '@/lib/tags';
import { POST_STATUS } from '@/lib/status';

export type AdminPostItem = {
  id: number;
  title: string;
  status: string;
  tagScene: string;
  featured: boolean;
  featuredOrder: number;
  deletedAt: string | null;
  createdAt: string;
  author: { id: number; nickname: string };
};

export type ReviewPostItem = {
  id: number;
  title: string;
  status: string;
  tagScene: string;
  mcpApproved: boolean;
  reviewFlag: string | null;
  securityLevel: string;
  version: number;
  createdAt: string;
  author: { id: number; nickname: string };
};

export type OverviewStats = {
  totalPosts: number;
  totalUsers: number;
  totalMcpCalls: number;
  featuredCount: number;
  todayPosts: number;
  todayUsers: number;
  todayMcp: number;
};

export type McpStats = {
  tokenUsers: number;
  byTool: { tool: string; count: number }[];
  recent: { tool: string; postId: number | null; nickname: string; createdAt: string }[];
};

export type ReportItem = {
  id: number;
  reason: string;
  status: string;
  createdAt: string;
  reporter: { id: number; nickname: string };
  post: {
    id: number;
    title: string;
    status: string;
    deletedAt: string | null;
    author: { id: number; nickname: string };
  };
};

type Tab = 'overview' | 'content' | 'review' | 'reports' | 'mcp' | 'mine' | 'data';

const STATUS_LABEL: Record<string, string> = {
  [POST_STATUS.DRAFT]: '草稿',
  [POST_STATUS.PENDING]: '待审',
  [POST_STATUS.PUBLISHED]: '已发布',
  [POST_STATUS.REJECTED]: '已拒绝',
};

const SECURITY_LEVEL_LABEL: Record<string, string> = {
  safe: '安全',
  suspicious: '可疑',
  reject: '拒绝',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminConsoleClient({
  initialItems,
  myPosts,
  initialReviewItems,
  initialReportItems,
  overview,
  mcp,
  adminId,
}: {
  initialItems: AdminPostItem[];
  myPosts: AdminPostItem[];
  initialReviewItems: ReviewPostItem[];
  initialReportItems: ReportItem[];
  overview: OverviewStats;
  mcp: McpStats;
  adminId: number;
}) {
  const [tab, setTab] = useState<Tab>('overview');
  const [items, setItems] = useState<AdminPostItem[]>(initialItems);
  const [reviewItems, setReviewItems] = useState<ReviewPostItem[]>(initialReviewItems);
  const [reportItems, setReportItems] = useState<ReportItem[]>(initialReportItems);
  const [featured, setFeatured] = useState<AdminPostItem[]>(() =>
    initialItems
      .filter((i) => i.featured && !i.deletedAt)
      .sort((a, b) => a.featuredOrder - b.featuredOrder),
  );
  const [showDeleted, setShowDeleted] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const visible = items.filter((i) => (showDeleted ? true : !i.deletedAt));

  const flash = useCallback((ok: boolean, text: string) => {
    setToast({ ok, text });
    window.setTimeout(() => setToast(null), 2500);
  }, []);

  const onDelete = useCallback(
    async (post: AdminPostItem) => {
      if (post.deletedAt) return;
      if (typeof window !== 'undefined' && !window.confirm(`确认软删「${post.title}」？`)) return;
      setBusyId(post.id);
      try {
        const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          flash(false, `删除失败：${data?.error ?? res.status}`);
          return;
        }
        const nowIso = new Date().toISOString();
        setItems((prev) => prev.map((i) => (i.id === post.id ? { ...i, deletedAt: nowIso } : i)));
        setFeatured((prev) => prev.filter((i) => i.id !== post.id));
        flash(true, `已软删「${post.title}」`);
      } catch {
        flash(false, '网络错误，删除失败');
      } finally {
        setBusyId(null);
      }
    },
    [flash],
  );

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
        const data = await res.json();
        setItems((prev) => prev.map((i) => (i.id === post.id ? { ...i, featured: next, featuredOrder: data.featuredOrder ?? i.featuredOrder } : i)));
        // 同步精选拖拽列表
        setFeatured((prev) => {
          if (!next) return prev.filter((i) => i.id !== post.id);
          const exists = prev.some((i) => i.id === post.id);
          const updated: AdminPostItem = { ...post, featured: true, featuredOrder: data.featuredOrder ?? 0 };
          return exists ? prev.map((i) => (i.id === post.id ? updated : i)) : [...prev, updated];
        });
        flash(true, next ? `已精选「${post.title}」` : `已取消精选「${post.title}」`);
      } catch {
        flash(false, '网络错误，操作失败');
      } finally {
        setBusyId(null);
      }
    },
    [flash],
  );

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: '概览' },
    { key: 'content', label: '内容审核' },
    ...(reviewItems.length > 0 ? [{ key: 'review' as const, label: `待审 (${reviewItems.length})` }] : []),
    ...(reportItems.length > 0 ? [{ key: 'reports' as const, label: `举报 (${reportItems.length})` }] : []),
    { key: 'mcp', label: 'MCP 状态' },
    { key: 'mine', label: '我的发布' },
    { key: 'data', label: '数据' },
  ];

  const onReview = useCallback(
    async (post: ReviewPostItem, action: 'approve' | 'reject' | 'revoke') => {
      const verb = action === 'approve' ? '通过' : action === 'reject' ? '拒绝' : '撤回 MCP';
      if (typeof window !== 'undefined' && !window.confirm(`确认${verb}「${post.title}」？`)) return;
      setBusyId(post.id);
      try {
        const res = await fetch(`/api/admin/posts/${post.id}/review`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          flash(false, `操作失败：${data?.error ?? res.status}`);
          return;
        }
        const data = await res.json();
        setReviewItems((prev) => {
          // approve → 清 reviewFlag + status=published：移出待审队列
          // reject  → status=rejected：不再 pending，reviewFlag 不变但状态已结案，移出
          // revoke  → 仅切换 mcpApproved；reviewFlag 非空的 suspicious 仍需复核 → 留在队列
          if (action === 'approve' || action === 'reject') {
            return prev.filter((i) => i.id !== post.id);
          }
          return prev.map((i) =>
            i.id === post.id ? { ...i, mcpApproved: Boolean(data.mcpApproved) } : i,
          );
        });
        flash(true, `${verb}「${post.title}」已生效`);
      } catch {
        flash(false, '网络错误，操作失败');
      } finally {
        setBusyId(null);
      }
    },
    [flash],
  );

  // SEC-011 举报处置：closed（成立，配合内容审核动作）/ dismissed（驳回）
  // 用 report.id 做 busyId 命名空间（避免和 post.id 冲突），用负数偏移确保不撞
  const onResolveReport = useCallback(
    async (report: ReportItem, action: 'closed' | 'dismissed') => {
      const verb = action === 'closed' ? '标记已处理' : '驳回举报';
      if (typeof window !== 'undefined' && !window.confirm(`确认${verb}「#${report.id}」？`)) return;
      setBusyId(-report.id);
      try {
        const res = await fetch(`/api/admin/reports/${report.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          flash(false, `操作失败：${data?.error ?? res.status}`);
          return;
        }
        // 两种动作都从 open 队列移除（closed/dismissed 都不再是 open）
        setReportItems((prev) => prev.filter((i) => i.id !== report.id));
        flash(true, `${verb}「#${report.id}」已生效`);
      } catch {
        flash(false, '网络错误，操作失败');
      } finally {
        setBusyId(null);
      }
    },
    [flash],
  );

  return (
    <div>
      {/* Tab 条 */}
      <div className="flex items-center gap-1 mb-6 border-b border-paper-edge overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2 font-serif text-sm whitespace-nowrap transition-colors border-b-2 -mb-px',
              tab === t.key ? 'border-wax-red text-ink-brown' : 'border-transparent text-sepia hover:text-ink-brown',
            )}
          >
            {t.label}
          </button>
        ))}
        {toast && (
          <span className={cn('ml-auto font-sans text-xs px-2 py-1 rounded-sm', toast.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800')}>
            {toast.text}
          </span>
        )}
      </div>

      {/* —— 概览 —— */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div>
            <p className="font-serif italic text-xs text-sepia mb-3">今日</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard value={overview.todayPosts} label="今日新帖" accent="#3D2E1F" />
              <StatCard value={overview.todayUsers} label="今日新用户" accent="#8B6F4E" />
              <StatCard value={overview.todayMcp} label="今日 MCP 调用" accent="#A88339" />
              <StatCard value={overview.featuredCount} label="精选数" accent="#4F5B3B" />
            </div>
          </div>
          <div>
            <p className="font-serif italic text-xs text-sepia mb-3">累计</p>
            <div className="grid grid-cols-3 gap-3">
              <StatCard value={overview.totalPosts} label="帖子总数" sub="未软删" />
              <StatCard value={overview.totalUsers} label="用户总数" />
              <StatCard value={overview.totalMcpCalls} label="MCP 调用总数" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="secondary" onClick={() => setTab('content')}>去内容审核 →</Button>
            <Button variant="secondary" onClick={() => setTab('data')}>看完整数据 →</Button>
          </div>
        </div>
      )}

      {/* —— 内容审核 —— */}
      {tab === 'content' && (
        <div className="space-y-8">
          {/* 精选拖拽排序 */}
          <FeaturedDragPanel featured={featured} onReorder={setFeatured} onToggleFeatured={onToggleFeatured} busyId={busyId} flash={flash} />

          {/* 工具条 */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="inline-flex items-center gap-2 font-sans text-sm text-leather cursor-pointer select-none">
              <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} className="h-4 w-4 accent-ink-brown" />
              显示已软删帖子
            </label>
            <span className="font-mono text-[11px] text-sepia ml-auto">{visible.length} 条</span>
          </div>

          {visible.length === 0 ? (
            <div className="border border-paper-edge bg-vellum rounded-md p-10 text-center">
              <p className="font-serif italic text-sepia">{showDeleted ? '暂无帖子（含软删）' : '暂无活跃帖子'}</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {visible.map((p) => (
                <PostRow key={p.id} p={p} adminId={adminId} isBusy={busyId === p.id} onDelete={onDelete} onToggleFeatured={onToggleFeatured} />
              ))}
            </ul>
          )}
        </div>
      )}

      {/* —— 待审队列（SEC-007）—— */}
      {tab === 'review' && (
        <div className="space-y-6">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h2 className="font-serif text-lg text-ink-brown">MCP 准入审核</h2>
            <span className="font-sans text-[11px] text-sepia">
              列出 status=pending 或 reviewFlag 非空的帖子 · GLM 安全扫描（SEC-006）标记的 suspicious/reject 会进入此处
            </span>
          </div>

          {reviewItems.length === 0 ? (
            <div className="border border-paper-edge bg-vellum rounded-md p-10 text-center">
              <p className="font-serif italic text-sepia">暂无待审内容 · 投稿经 GLM 扫描后若被标 suspicious/reject 会自动出现在此</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {reviewItems.map((p) => (
                <ReviewRow key={p.id} p={p} isBusy={busyId === p.id} onReview={onReview} />
              ))}
            </ul>
          )}
        </div>
      )}

      {/* —— 举报队列（SEC-011）—— */}
      {tab === 'reports' && (
        <div className="space-y-6">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h2 className="font-serif text-lg text-ink-brown">社区举报</h2>
            <span className="font-sans text-[11px] text-sepia">
              用户在帖子详情页提交的举报 · 标记 closed（成立，配合内容审核处置）或 dismissed（驳回）
            </span>
          </div>

          {reportItems.length === 0 ? (
            <div className="border border-paper-edge bg-vellum rounded-md p-10 text-center">
              <p className="font-serif italic text-sepia">暂无 open 举报</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {reportItems.map((r) => (
                <ReportRow key={r.id} r={r} isBusy={busyId === -r.id} onResolve={onResolveReport} />
              ))}
            </ul>
          )}
        </div>
      )}

      {/* —— MCP 状态 —— */}
      {tab === 'mcp' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard value={mcp.tokenUsers} label="已配置 MCP Token" accent="#4F5B3B" />
            <StatCard value={overview.totalMcpCalls} label="累计调用" accent="#A88339" />
            <StatCard value={overview.todayMcp} label="今日调用" accent="#3D2E1F" />
          </div>

          <div>
            <h3 className="font-serif text-base text-ink-brown mb-3">工具调用分布</h3>
            <div className="border border-paper-edge bg-vellum/50 rounded-md p-4">
              <BarList items={mcp.byTool.map((t) => ({ label: t.tool, value: t.count }))} />
            </div>
          </div>

          <div>
            <h3 className="font-serif text-base text-ink-brown mb-3">最近调用</h3>
            <div className="border border-paper-edge bg-vellum/50 rounded-md divide-y divide-paper-edge">
              {mcp.recent.length === 0 ? (
                <p className="p-4 font-serif italic text-xs text-sepia">暂无调用记录</p>
              ) : (
                mcp.recent.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2 font-mono text-[11px] text-leather">
                    <span className="text-ink-brown">{r.tool}</span>
                    <span className="text-sepia">{r.nickname}</span>
                    {r.postId && <Link href={`/posts/${r.postId}`} className="text-sepia hover:text-ink-brown">#{r.postId}</Link>}
                    <span className="ml-auto text-sepia">{formatDate(r.createdAt)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* —— 我的发布 —— */}
      {tab === 'mine' && (
        <div>
          {myPosts.length === 0 ? (
            <div className="border border-paper-edge bg-vellum rounded-md p-10 text-center">
              <p className="font-serif italic text-sepia mb-3">你还没发布过内容</p>
              <Link href="/publish" className="inline-flex items-center h-9 px-4 bg-ink-brown text-vellum font-serif text-sm rounded-sm">去发布</Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {myPosts.map((p) => (
                <PostRow key={p.id} p={p} adminId={adminId} isBusy={busyId === p.id} onDelete={onDelete} onToggleFeatured={onToggleFeatured} />
              ))}
            </ul>
          )}
        </div>
      )}

      {/* —— 数据 —— */}
      {tab === 'data' && <MetricsView />}
    </div>
  );
}

/* ============================================================
   精选拖拽排序面板
   ============================================================ */
function FeaturedDragPanel({
  featured,
  onReorder,
  onToggleFeatured,
  busyId,
  flash,
}: {
  featured: AdminPostItem[];
  onReorder: (next: AdminPostItem[]) => void;
  onToggleFeatured: (p: AdminPostItem) => void;
  busyId: number | null;
  flash: (ok: boolean, text: string) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const handleDrop = async (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      return;
    }
    const next = [...featured];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, moved);
    onReorder(next);
    setDragIndex(null);

    setSaving(true);
    try {
      const res = await fetch('/api/admin/posts/featured-order', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: next.map((f) => f.id) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        flash(false, `排序保存失败：${data?.error ?? res.status}`);
      }
    } catch {
      flash(false, '网络错误，排序未保存');
    } finally {
      setSaving(false);
    }
  };

  if (featured.length === 0) {
    return (
      <div className="border border-dashed border-paper-edge bg-vellum/40 rounded-md p-5">
        <h3 className="font-serif text-base text-ink-brown mb-1">精选排序</h3>
        <p className="font-sans text-xs text-sepia">还没有精选内容。在下方列表点「精选」后，可拖拽调整首页展示顺序。</p>
      </div>
    );
  }

  return (
    <div className="border border-gilded/40 bg-gilded/5 rounded-md p-5">
      <div className="flex items-baseline gap-3 mb-3">
        <h3 className="font-serif text-base text-ink-brown">精选排序</h3>
        <span className="font-sans text-[11px] text-sepia">拖拽调整首页展示顺序（第 1 个最显眼）</span>
        {saving && <span className="ml-auto font-sans text-[11px] text-gilded">保存中…</span>}
      </div>
      <ul className="space-y-1.5">
        {featured.map((p, i) => (
          <li
            key={p.id}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(i)}
            className={cn(
              'flex items-center gap-3 bg-vellum border border-paper-edge rounded px-3 py-2 cursor-grab active:cursor-grabbing transition-colors',
              dragIndex === i && 'opacity-50 border-gilded',
            )}
          >
            <span className="font-mono text-[11px] text-sepia shrink-0">{i + 1}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="text-paper-edge shrink-0"><circle cx="3" cy="3" r="1" /><circle cx="9" cy="3" r="1" /><circle cx="3" cy="9" r="1" /><circle cx="9" cy="9" r="1" /></svg>
            <Link href={`/posts/${p.id}`} className="font-serif text-sm text-ink-brown hover:text-wax-red flex-1 min-w-0 truncate">{p.title}</Link>
            <span className="font-mono text-[10px] text-sepia shrink-0 hidden sm:inline">{sceneLabel(p.tagScene)}</span>
            <button
              type="button"
              onClick={() => onToggleFeatured(p)}
              disabled={busyId === p.id}
              className="font-sans text-[11px] text-wax-red hover:underline shrink-0"
            >
              取消精选
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ============================================================
   单条帖子行
   ============================================================ */
function PostRow({
  p,
  adminId,
  isBusy,
  onDelete,
  onToggleFeatured,
}: {
  p: AdminPostItem;
  adminId: number;
  isBusy: boolean;
  onDelete: (p: AdminPostItem) => void;
  onToggleFeatured: (p: AdminPostItem) => void;
}) {
  const deleted = !!p.deletedAt;
  return (
    <li className={cn('border border-paper-edge bg-vellum rounded-md p-4', deleted && 'opacity-60')}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/posts/${p.id}`} className="font-serif text-lg text-ink-brown hover:text-wax-red truncate">{p.title}</Link>
            {p.featured && <span className="font-sans text-[10px] px-1.5 py-0.5 bg-ink-brown text-vellum rounded-sm">精选</span>}
            {deleted && <span className="font-sans text-[10px] px-1.5 py-0.5 border border-wax-red text-wax-red rounded-sm">已软删</span>}
          </div>
          <div className="mt-1 flex items-center gap-3 flex-wrap font-mono text-[11px] text-sepia">
            <span>#{p.id}</span>
            <span>{STATUS_LABEL[p.status] ?? p.status}</span>
            <span>{sceneLabel(p.tagScene)}</span>
            <Link href={`/profile/${p.author.id}`} className="hover:text-ink-brown">@{p.author.nickname}</Link>
            <span>{formatDate(p.createdAt)}</span>
            {deleted && p.deletedAt && <span className="text-wax-red">删除于 {formatDate(p.deletedAt)}</span>}
            {p.author.id === adminId && <span className="text-sepia italic">（你的帖子）</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant={p.featured ? 'secondary' : 'primary'} disabled={isBusy || deleted} onClick={() => onToggleFeatured(p)} title={deleted ? '已软删的帖子不可精选' : ''}>
            {p.featured ? '取消精选' : '精选'}
          </Button>
          <Button size="sm" variant="secondary" disabled={isBusy || deleted} onClick={() => onDelete(p)} title={deleted ? '已软删' : ''}>
            删除
          </Button>
        </div>
      </div>
    </li>
  );
}

/* ============================================================
   待审帖子行（SEC-007 MCP 准入审核）
   ============================================================ */
function ReviewRow({
  p,
  isBusy,
  onReview,
}: {
  p: ReviewPostItem;
  isBusy: boolean;
  onReview: (p: ReviewPostItem, action: 'approve' | 'reject' | 'revoke') => void;
}) {
  const securityChipColor =
    p.securityLevel === 'reject'
      ? 'border-wax-red text-wax-red bg-wax-red/5'
      : p.securityLevel === 'suspicious'
        ? 'border-gilded text-gilded bg-gilded/5'
        : 'border-paper-edge text-sepia';
  return (
    <li className="border border-paper-edge bg-vellum rounded-md p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/posts/${p.id}`} className="font-serif text-lg text-ink-brown hover:text-wax-red truncate">{p.title}</Link>
            <span className={cn('font-sans text-[10px] px-1.5 py-0.5 border rounded-sm', securityChipColor)}>
              GLM: {SECURITY_LEVEL_LABEL[p.securityLevel] ?? p.securityLevel}
            </span>
            {p.mcpApproved && <span className="font-sans text-[10px] px-1.5 py-0.5 bg-green-50 text-green-800 rounded-sm">已准入 MCP</span>}
            {p.version > 1 && <span className="font-sans text-[10px] px-1.5 py-0.5 border border-paper-edge text-leather rounded-sm" title="编辑过会 +1 并撤回 MCP 准入（SEC-010 防 Rug Pull）">v{p.version}</span>}
          </div>
          <div className="mt-1 flex items-center gap-3 flex-wrap font-mono text-[11px] text-sepia">
            <span>#{p.id}</span>
            <span>{STATUS_LABEL[p.status] ?? p.status}</span>
            <span>{sceneLabel(p.tagScene)}</span>
            <Link href={`/profile/${p.author.id}`} className="hover:text-ink-brown">@{p.author.nickname}</Link>
            <span>{formatDate(p.createdAt)}</span>
          </div>
          {p.reviewFlag && (
            <div className="mt-2 px-2 py-1.5 border-l-2 border-gilded bg-gilded/5 font-sans text-xs text-leather">
              <span className="font-serif italic text-gilded mr-1">reviewFlag:</span>
              {p.reviewFlag}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button size="sm" variant="primary" disabled={isBusy} onClick={() => onReview(p, 'approve')} title="mcpApproved=true + status=published + 清 reviewFlag">
            通过 MCP
          </Button>
          <Button size="sm" variant="secondary" disabled={isBusy} onClick={() => onReview(p, 'reject')} title="status=rejected（公开视图下架）">
            拒绝
          </Button>
          {p.mcpApproved && (
            <Button size="sm" variant="secondary" disabled={isBusy} onClick={() => onReview(p, 'revoke')} title="mcpApproved=false（立即从 MCP 返回过滤掉）">
              撤回 MCP
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

/* ============================================================
   举报行（SEC-011 社区举报处置）
   ============================================================ */
function ReportRow({
  r,
  isBusy,
  onResolve,
}: {
  r: ReportItem;
  isBusy: boolean;
  onResolve: (r: ReportItem, action: 'closed' | 'dismissed') => void;
}) {
  const postDeleted = !!r.post.deletedAt;
  return (
    <li className="border border-wax-red/30 bg-vellum rounded-md p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[11px] text-wax-red">举报 #{r.id}</span>
            <Link href={`/posts/${r.post.id}`} className="font-serif text-base text-ink-brown hover:text-wax-red truncate">
              {r.post.title}
            </Link>
            {postDeleted && <span className="font-sans text-[10px] px-1.5 py-0.5 border border-wax-red text-wax-red rounded-sm">帖子已软删</span>}
            <span className="font-sans text-[10px] px-1.5 py-0.5 border border-paper-edge text-sepia rounded-sm">
              {STATUS_LABEL[r.post.status] ?? r.post.status}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 flex-wrap font-mono text-[11px] text-sepia">
            <span>post #{r.post.id}</span>
            <Link href={`/profile/${r.post.author.id}`} className="hover:text-ink-brown">作者 @{r.post.author.nickname}</Link>
            <span>·</span>
            <span>举报人 @{r.reporter.nickname}</span>
            <span>·</span>
            <span>{formatDate(r.createdAt)}</span>
          </div>
          <div className="mt-2 px-2 py-1.5 border-l-2 border-wax-red bg-wax-red/5 font-sans text-xs text-ink-brown">
            <span className="font-serif italic text-wax-red mr-1">举报理由:</span>
            {r.reason}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button size="sm" variant="primary" disabled={isBusy} onClick={() => onResolve(r, 'closed')} title="举报成立，标记已处理（配合内容审核动作处置）">
            标记已处理
          </Button>
          <Button size="sm" variant="secondary" disabled={isBusy} onClick={() => onResolve(r, 'dismissed')} title="举报无效/误报，驳回">
            驳回
          </Button>
        </div>
      </div>
    </li>
  );
}
