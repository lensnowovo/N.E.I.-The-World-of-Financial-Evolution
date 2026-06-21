'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type FavItem = {
  favoriteId: number;
  postId: number;
  sortOrder: number;
  note: string | null;
  title: string;
  tagScene: string;
  tagSkill: string | null;
  assetType: string | null;
  originalAuthor: string | null;
  author: string;
};

type Stats = {
  totalCalls: number;
  last7Days: number;
  topSkills: { postId: number; title: string; calls: number }[];
  sleeping: { postId: number; title: string }[];
};

const SCENE_LABELS: Record<string, string> = {
  sourcing: '项目发现', screening: '初筛判断', 'industry-research': '行业研究',
  'business-dd': '商业尽调', financial: '财务分析', legal: '法务合规',
  ic: 'IC 材料', 'post-investment': '投后管理', fundraising: '募资 / LP', crm: '知识管理',
};

export function DashboardClient({
  initialItems,
  initialStats,
  hasMcpToken,
  hasApiKey,
  userId,
}: {
  initialItems: FavItem[];
  initialStats: Stats;
  hasMcpToken: boolean;
  hasApiKey: boolean;
  userId: number;
}) {
  const [tab, setTab] = useState<'library' | 'stats' | 'connect'>('library');
  const [items, setItems] = useState(initialItems);
  const [stats] = useState(initialStats);
  const [mcpToken, setMcpToken] = useState('');
  const [mcpGenerating, setMcpGenerating] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [keySaving, setKeySaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Group by scene
  const grouped = new Map<string, FavItem[]>();
  for (const item of items) {
    const arr = grouped.get(item.tagScene) || [];
    arr.push(item);
    grouped.set(item.tagScene, arr);
  }

  const updateNote = useCallback(async (postId: number, note: string) => {
    await fetch(`/api/favorites/${postId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    setItems(prev => prev.map(i => i.postId === postId ? { ...i, note: note || null } : i));
  }, []);

  const moveItem = useCallback(async (postId: number, direction: 'up' | 'down') => {
    const sorted = [...items];
    const idx = sorted.findIndex(i => i.postId === postId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const a = sorted[idx];
    const b = sorted[swapIdx];
    // Swap sortOrder
    await Promise.all([
      fetch(`/api/favorites/${a.postId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sortOrder: b.sortOrder }) }),
      fetch(`/api/favorites/${b.postId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sortOrder: a.sortOrder }) }),
    ]);
    // Update local state
    setItems(prev => prev.map(i => {
      if (i.postId === a.postId) return { ...i, sortOrder: b.sortOrder };
      if (i.postId === b.postId) return { ...i, sortOrder: a.sortOrder };
      return i;
    }).sort((x, y) => x.sortOrder - y.sortOrder));
  }, [items]);

  const removeFav = useCallback(async (postId: number) => {
    await fetch(`/api/favorites/${postId}`, { method: 'DELETE' });
    setItems(prev => prev.filter(i => i.postId !== postId));
  }, []);

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-paper-edge">
        {([
          ['library', 'Skill 库'],
          ['stats', '使用统计'],
          ['connect', '连接状态'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'px-4 py-2 font-serif text-sm transition-colors border-b-2 -mb-px',
              tab === key
                ? 'border-wax-red text-ink-brown'
                : 'border-transparent text-sepia hover:text-ink-brown',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab 1: Skill 库 */}
      {tab === 'library' && (
        <div>
          {items.length === 0 ? (
            <div className="border border-paper-edge bg-vellum rounded-md py-14 px-8 text-center">
              <p className="font-serif italic text-leather text-lg mb-2">还没有收藏 Skill</p>
              <p className="font-sans text-sm text-sepia mb-6">去首页发现有用的 Skill，点「收藏」就会出现在这里</p>
              <Link href="/" className="inline-flex items-center h-9 px-4 bg-ink-brown text-vellum font-serif text-sm rounded-sm">去发现</Link>
            </div>
          ) : (
            <div className="space-y-8">
              {Array.from(grouped.entries()).map(([scene, sceneItems]) => (
                <div key={scene}>
                  <div className="flex items-baseline gap-3 mb-3">
                    <h3 className="font-serif text-lg text-ink-brown">{SCENE_LABELS[scene] || scene}</h3>
                    <span className="font-mono text-[11px] text-sepia">{sceneItems.length}</span>
                    <span className="flex-1 h-px bg-paper-edge" />
                  </div>
                  <div className="space-y-2">
                    {sceneItems.map((item, idx) => {
                      const globalIdx = items.findIndex(i => i.postId === item.postId);
                      return (
                        <FavRow
                          key={item.postId}
                          item={item}
                          canMoveUp={globalIdx > 0}
                          canMoveDown={globalIdx < items.length - 1}
                          onNoteSave={(note) => updateNote(item.postId, note)}
                          onMoveUp={() => moveItem(item.postId, 'up')}
                          onMoveDown={() => moveItem(item.postId, 'down')}
                          onRemove={() => removeFav(item.postId)}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: 使用统计 */}
      {tab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard label="总调用" value={stats.totalCalls} />
            <StatCard label="近 7 天" value={stats.last7Days} />
            <StatCard label="沉睡 Skill" value={stats.sleeping.length} />
          </div>

          {stats.topSkills.length > 0 && (
            <div>
              <h3 className="font-serif text-base text-ink-brown mb-3">最常用 Top 5</h3>
              <ol className="space-y-2">
                {stats.topSkills.map((s, i) => (
                  <li key={s.postId} className="flex items-center gap-3 text-sm">
                    <span className="font-mono text-xs text-sepia num-osf w-4">{i + 1}</span>
                    <Link href={`/posts/${s.postId}`} className="font-serif text-ink-brown hover:text-wax-red flex-1 truncate">{s.title}</Link>
                    <span className="font-mono text-xs text-sepia">{s.calls} 次</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {stats.sleeping.length > 0 && (
            <div>
              <h3 className="font-serif text-base text-ink-brown mb-3">收藏了但从没用过</h3>
              <ul className="space-y-1">
                {stats.sleeping.map((s) => (
                  <li key={s.postId}>
                    <Link href={`/posts/${s.postId}`} className="font-sans text-sm text-leather hover:text-wax-red">{s.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {stats.totalCalls === 0 && (
            <div className="border border-paper-edge bg-vellum rounded-md py-10 px-6 text-center">
              <p className="font-serif italic text-sm text-sepia">
                还没有 MCP 调用记录。配置好 MCP 连接后在客户端使用 Skill，这里会显示统计。
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: 连接状态 */}
      {tab === 'connect' && (
        <div className="space-y-6">
          {/* MCP */}
          <div className="rounded-lg border-2 border-gilded/40 bg-gilded/5 p-5">
            <h3 className="font-serif text-base text-ink-brown mb-2">MCP Server（推荐）</h3>
            {mcpToken ? (
              <div className="space-y-2">
                <div className="p-3 rounded border border-gilded bg-vellum">
                  <p className="font-sans text-xs text-leather mb-1">MCP Token（只显示一次）：</p>
                  <code className="font-mono text-sm text-ink-brown break-all">{mcpToken}</code>
                </div>
                <Button type="button" variant="secondary" onClick={() => navigator.clipboard.writeText(mcpToken)}>复制 Token</Button>
                <Link href="/mcp" className="ml-2 inline-flex items-center h-9 px-4 border border-paper-edge text-sm font-serif rounded-sm">配置指南 →</Link>
              </div>
            ) : hasMcpToken ? (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 h-9 px-4 border border-moss/40 bg-moss/5 text-moss text-sm font-sans rounded-sm">
                  ✓ 已配置
                </span>
                <button type="button" onClick={async () => { setMcpGenerating(true); const r = await fetch('/api/users/me/mcp-token', { method: 'POST' }); const d = await r.json(); setMcpGenerating(false); if (r.ok) setMcpToken(d.token); }} disabled={mcpGenerating} className="text-sm text-wax-red hover:underline font-sans">
                  {mcpGenerating ? '生成中…' : '重新生成'}
                </button>
                <Link href="/mcp" className="text-sm text-leather hover:text-ink-brown font-serif italic">配置指南 →</Link>
              </div>
            ) : (
              <div>
                <p className="font-sans text-xs text-leather mb-3">让你的 AI 客户端直接搜索和调用 N.E.I. 的 Skill</p>
                <Button type="button" onClick={async () => { setMcpGenerating(true); const r = await fetch('/api/users/me/mcp-token', { method: 'POST' }); const d = await r.json(); setMcpGenerating(false); if (r.ok) setMcpToken(d.token); }} disabled={mcpGenerating}>
                  {mcpGenerating ? '生成中…' : '生成 MCP Token'}
                </Button>
              </div>
            )}
          </div>

          {/* API Key */}
          <div className="rounded-lg border-2 border-paper-edge bg-vellum/40 p-5">
            <h3 className="font-serif text-base text-ink-brown mb-2">网站执行 API Key（选填）</h3>
            {hasApiKey ? (
              <span className="inline-flex items-center gap-1.5 h-9 px-4 border border-moss/40 bg-moss/5 text-moss text-sm font-sans rounded-sm">✓ 已配置</span>
            ) : (
              <div>
                <p className="font-sans text-xs text-leather mb-2">配置后可在网站直接执行 Prompt</p>
                <form onSubmit={async (e) => {
                  e.preventDefault(); setMsg(null); if (!apiKey.trim()) return;
                  setKeySaving(true);
                  const r = await fetch('/api/users/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: apiKey.trim() }) });
                  setKeySaving(false);
                  setApiKey('');
                  setMsg(r.ok ? { ok: true, text: '已保存' } : { ok: false, text: '保存失败' });
                }}>
                  <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-ant-..." />
                  {msg && <p className={cn('mt-2 text-sm', msg.ok ? 'text-moss' : 'text-wax-red')}>{msg.text}</p>}
                  <Button type="submit" disabled={keySaving || !apiKey.trim()} className="mt-2">{keySaving ? '保存中…' : '保存'}</Button>
                </form>
              </div>
            )}
          </div>

          <Link href="/connect" className="inline-flex items-center text-sm text-leather hover:text-ink-brown font-serif italic">
            完整连接配置 →
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-paper-edge bg-vellum rounded-md p-4 text-center">
      <p className="font-serif text-2xl text-ink-brown num-osf">{value}</p>
      <p className="font-sans text-xs text-sepia mt-1">{label}</p>
    </div>
  );
}

function FavRow({
  item, canMoveUp, canMoveDown, onNoteSave, onMoveUp, onMoveDown, onRemove,
}: {
  item: FavItem;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onNoteSave: (note: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [noteText, setNoteText] = useState(item.note || '');

  return (
    <div className="border border-paper-edge bg-vellum/60 rounded p-3 group hover:border-sepia transition-colors">
      <div className="flex items-center gap-3">
        {/* 排序按钮 */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <button type="button" onClick={onMoveUp} disabled={!canMoveUp} className={cn('text-sepia hover:text-ink-brown disabled:opacity-20 transition-colors', !canMoveUp && 'cursor-default')} aria-label="上移">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 7L6 4L9 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" onClick={onMoveDown} disabled={!canMoveDown} className={cn('text-sepia hover:text-ink-brown disabled:opacity-20 transition-colors', !canMoveDown && 'cursor-default')} aria-label="下移">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5L6 8L9 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>

        {/* 标题 */}
        <Link href={`/posts/${item.postId}`} className="font-serif text-sm text-ink-brown hover:text-wax-red flex-1 min-w-0 truncate">
          {item.title}
        </Link>

        {/* 类型 */}
        {item.assetType && (
          <span className="font-mono text-[10px] text-sepia shrink-0 hidden sm:inline">{item.assetType}</span>
        )}

        {/* 操作 */}
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={() => { setEditing(!editing); setNoteText(item.note || ''); }} className="text-sepia hover:text-ink-brown transition-colors p-1" aria-label="备注">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M2 10 L2 8 L8 2 L10 4 L4 10 Z" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" onClick={onRemove} className="text-sepia hover:text-wax-red transition-colors p-1" aria-label="取消收藏">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M1 1 L11 11 M11 1 L1 11" strokeLinecap="round" /></svg>
          </button>
        </div>
      </div>

      {/* 备注 */}
      {editing ? (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            maxLength={500}
            placeholder="加个备注（如：上周看 AI 项目时用的）"
            className="flex-1 bg-transparent border border-paper-edge rounded px-2 py-1 text-xs text-ink-brown placeholder:text-sepia/60 focus:border-ink-brown focus:outline-none"
          />
          <button type="button" onClick={() => { onNoteSave(noteText); setEditing(false); }} className="text-xs text-wax-red hover:underline font-sans">保存</button>
          <button type="button" onClick={() => setEditing(false)} className="text-xs text-sepia hover:text-ink-brown font-sans">取消</button>
        </div>
      ) : item.note ? (
        <p className="mt-1.5 font-sans text-xs text-leather italic pl-7">💬 {item.note}</p>
      ) : null}
    </div>
  );
}
