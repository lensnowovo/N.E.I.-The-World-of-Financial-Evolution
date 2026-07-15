'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { TimeText } from '@/components/TimeText';
import {
  McpOnboardingChecklist,
  type McpOnboardingStatus,
} from '@/components/mcp/McpOnboardingChecklist';

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

type MyPost = {
  id: number;
  title: string;
  tagScene: string;
  viewCount: number;
  updatedAt: string;
};

type McpCallLog = {
  id: number;
  tool: string;
  postId: number | null;
  clientName: string | null;
  createdAt: string;
};

type DefaultDiscipline = {
  id: number;
  title: string;
  assetType: string;
  usageNotes: string | null;
  updatedAt: string;
  text: string;
  isDefault: boolean;
};

const SCENE_LABELS: Record<string, string> = {
  sourcing: '项目发现', screening: '初筛判断', 'industry-research': '行业研究',
  'business-dd': '商业尽调', financial: '财务分析', legal: '法务合规',
  ic: 'IC 材料', 'post-investment': '投后管理', fundraising: '募资 / LP', crm: '知识管理',
};

export function DashboardClient({
  initialItems,
  initialStats,
  myPosts,
  hasMcpToken,
  activeTokenCount,
  connectedTokenCount,
  mcpCallLogs,
  defaultDiscipline,
  disciplines,
  mcpOnboardingStatus,
  userId,
}: {
  initialItems: FavItem[];
  initialStats: Stats;
  myPosts: MyPost[];
  hasMcpToken: boolean;
  activeTokenCount: number;
  connectedTokenCount: number;
  mcpCallLogs: McpCallLog[];
  defaultDiscipline: DefaultDiscipline | null;
  disciplines: DefaultDiscipline[];
  mcpOnboardingStatus: McpOnboardingStatus;
  userId: number;
}) {
  const [tab, setTab] = useState<'stars' | 'mine' | 'discipline' | 'mcp'>('stars');
  const [items, setItems] = useState(initialItems);
  const [organizing, setOrganizing] = useState(false);
  const [stats] = useState(initialStats);
  const currentMcpOnboardingStatus: McpOnboardingStatus = {
    ...mcpOnboardingStatus,
    favoriteCount: items.length,
    hasMcpToken,
  };
  const onboardingComplete = currentMcpOnboardingStatus.hasMcpToken
    && currentMcpOnboardingStatus.hasAnyMcpCall
    && currentMcpOnboardingStatus.hasListMySkillsCall;

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
    const current = items.find((item) => item.postId === postId);
    if (!current) return;
    const sorted = items.filter((item) => item.tagScene === current.tagScene).sort((a, b) => a.sortOrder - b.sortOrder);
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
      <div className="mb-7 flex items-center gap-1 overflow-x-auto overflow-y-hidden border-b border-paper-edge" role="tablist" aria-label="个人工作台">
        {([
          ['stars', '我的收藏'],
          ['mine', '我的发布'],
          ['discipline', '工作纪律'],
          ['mcp', 'MCP 连接'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            id={`dashboard-tab-${key}`}
            type="button"
            role="tab"
            aria-selected={tab === key}
            aria-controls={`dashboard-panel-${key}`}
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

      {/* Tab: 我的收藏（收藏管理 + 控制台概览数据） */}
      {tab === 'stars' && (
        <div id="dashboard-panel-stars" role="tabpanel" aria-labelledby="dashboard-tab-stars">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-display text-[10px] uppercase tracking-[0.2em] text-gilded">My library</p>
              <h2 className="mt-1 font-serif text-2xl text-ink-brown">收藏库</h2>
              <p className="mt-1 font-sans text-sm text-sepia">按任务场景归档；需要调整顺序或备注时，再进入整理模式。</p>
            </div>
            {items.length > 0 && (
              <button type="button" onClick={() => setOrganizing((value) => !value)} className={cn('inline-flex h-9 items-center border px-4 font-serif text-sm transition-colors', organizing ? 'border-ink-brown bg-ink-brown text-parchment' : 'border-paper-edge bg-vellum text-leather hover:border-ink-brown')}>
                {organizing ? '完成整理' : '整理收藏'}
              </button>
            )}
          </div>

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
                  <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2">
                    {sceneItems.map((item, idx) => {
                      return (
                        <FavRow
                          key={item.postId}
                          item={item}
                          organizing={organizing}
                          canMoveUp={idx > 0}
                          canMoveDown={idx < sceneItems.length - 1}
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

      {/* Tab: 我的发布（DASH-002：我发的帖 + 编辑入口 / 删除提示） */}
      {tab === 'mine' && (
        <div id="dashboard-panel-mine" role="tabpanel" aria-labelledby="dashboard-tab-mine">
          {myPosts.length === 0 ? (
            <div className="border border-paper-edge bg-vellum rounded-md py-14 px-8 text-center">
              <p className="font-serif italic text-leather text-lg mb-2">还没有发布内容</p>
              <p className="font-sans text-sm text-sepia mb-6">分享你的知识，让同行看见你的专业</p>
              <Link href="/publish" className="inline-flex items-center h-9 px-4 bg-ink-brown text-vellum font-serif text-sm rounded-sm">去发布</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {myPosts.map((p) => (
                <MyPostRow key={p.id} post={p} />
              ))}
              <p className="mt-4 font-sans text-xs text-sepia italic">
                需要删除已发布的内容？<Link href="/admin" className="text-leather hover:text-ink-brown underline">联系管理员</Link>，或在帖子详情页右上角操作中提交处理。
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab: 工作纪律（Agent 默认上下文） */}
      {tab === 'discipline' && (
        <div id="dashboard-panel-discipline" className="space-y-6" role="tabpanel" aria-labelledby="dashboard-tab-discipline">
          <div className="rounded-lg border border-paper-edge bg-vellum/50 p-5">
            <p className="font-display tracking-display text-[10px] uppercase text-sepia mb-2">
              Agent Context
            </p>
            <h2 className="font-serif text-2xl text-ink-brown mb-2">我的工作纪律</h2>
            <p className="max-w-3xl font-sans text-sm leading-7 text-leather">
              工作纪律是 Agent 的第一层上下文，用来约束后续 Skill / Workflow 的执行方式。
              它不解决某个具体任务，而是要求 AI 在投研、尽调、建模、Memo 和汇报中保持真实、审慎、可追溯。
            </p>
          </div>

          <DefaultDisciplinePanel discipline={defaultDiscipline} />

          <div className="rounded-lg border border-paper-edge bg-vellum/40 p-5">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <div>
                <p className="font-display tracking-display text-[10px] uppercase text-sepia mb-1">
                  Available Disciplines
                </p>
                <h3 className="font-serif text-lg text-ink-brown">可用纪律</h3>
              </div>
              <span className="font-mono text-xs text-sepia">{disciplines.length} 条</span>
            </div>
            {disciplines.length === 0 ? (
              <p className="font-sans text-sm text-sepia italic">还没有可用工作纪律。</p>
            ) : (
              <div className="space-y-2">
                {disciplines.map((discipline) => (
                  <DisciplineRow key={discipline.id} discipline={discipline} />
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <DisciplineHint title="MCP 调用" body="在客户端调用 get_default_discipline，先加载默认纪律，再执行具体 Skill。" />
            <DisciplineHint title="站内阅读" body="打开纪律详情页，可直接复制原文或收藏到自己的 Skill Library。" />
            <DisciplineHint title="未来扩展" body="后续可加入财务建模、证据分级、保密边界等更细分纪律。" />
          </div>
        </div>
      )}

      {/* Tab: MCP 连接（DASH-003：token 状态 + 生成/撤销 + 调用历史） */}
      {tab === 'mcp' && (
        <div id="dashboard-panel-mcp" className="space-y-6" role="tabpanel" aria-labelledby="dashboard-tab-mcp">
          {onboardingComplete ? (
            <div className="flex flex-col gap-3 border-y border-moss/30 bg-moss/[0.045] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-moss shadow-[0_0_12px_rgba(77,94,63,0.45)]" aria-hidden="true" />
                <div>
                  <p className="font-serif text-sm text-ink-brown">MCP 已调通</p>
                  <p className="font-sans text-xs text-sepia">{connectedTokenCount} 个客户端已产生真实调用，完整引导已自动收起。</p>
                </div>
              </div>
              <Link href="/connect" className="font-serif text-sm italic text-leather hover:text-ink-brown">查看连接状态 →</Link>
            </div>
          ) : (
            <McpOnboardingChecklist status={currentMcpOnboardingStatus} compact />
          )}

          {stats.totalCalls > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="border border-paper-edge bg-vellum rounded-md p-3 text-center">
                <p className="font-serif text-xl text-ink-brown num-osf">{stats.totalCalls}</p>
                <p className="font-sans text-[10px] text-sepia">总调用</p>
              </div>
              <div className="border border-paper-edge bg-vellum rounded-md p-3 text-center">
                <p className="font-serif text-xl text-ink-brown num-osf">{stats.last7Days}</p>
                <p className="font-sans text-[10px] text-sepia">近 7 天</p>
              </div>
              <div className="border border-paper-edge bg-vellum rounded-md p-3 text-center">
                <p className="font-serif text-xl text-ink-brown num-osf">{items.length}</p>
                <p className="font-sans text-[10px] text-sepia">可调用收藏</p>
              </div>
              <div className="border border-paper-edge bg-vellum rounded-md p-3 text-center">
                <p className="font-serif text-xl text-wax-red num-osf">{stats.sleeping.length}</p>
                <p className="font-sans text-[10px] text-sepia">沉睡 Skill</p>
              </div>
            </div>
          )}

          {stats.topSkills.length > 0 && (
            <div className="flex flex-wrap gap-3 text-xs">
              {stats.topSkills.slice(0, 3).map((s, i) => (
                <Link key={s.postId} href={`/posts/${s.postId}`} className="inline-flex items-center gap-1 text-leather hover:text-ink-brown font-serif italic">
                  <span className="text-sepia num-osf">#{i + 1}</span>
                  {s.title.slice(0, 16)}…
                  <span className="font-mono text-sepia">{s.calls}×</span>
                </Link>
              ))}
            </div>
          )}

          {/* Credential mutations live in /connect so this page cannot
              accidentally invalidate a different client's Token. */}
          <div className="border border-gilded/45 bg-gilded/5 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <p className="font-display text-[10px] uppercase tracking-[0.18em] text-gilded">Agent access</p>
              <h3 className="mt-1 font-serif text-lg text-ink-brown">MCP 客户端连接</h3>
              <p className="mt-2 font-sans text-sm leading-6 text-leather">
                当前保留 {activeTokenCount} 个有效凭证，其中 {connectedTokenCount} 个已产生真实连接。每个客户端可单独命名和撤销。
              </p>
            </div>
            <Link href="/connect" className="mt-4 inline-flex h-10 shrink-0 items-center border border-ink-brown bg-ink-brown px-5 font-serif text-sm text-parchment transition-colors hover:bg-sepia sm:mt-0">
              管理客户端连接 →
            </Link>
          </div>

          {/* MCP 调用历史（最近 10 条） */}
          <div className="rounded-lg border border-paper-edge bg-vellum/40 p-5">
            <h3 className="font-serif text-base text-ink-brown mb-3">最近调用</h3>
            {mcpCallLogs.length === 0 ? (
              <p className="font-sans text-sm text-sepia italic">还没有 MCP 调用记录。配置 Token 后通过 AI 客户端调用 Skill 会出现在这里。</p>
            ) : (
              <div className="space-y-1.5">
                {mcpCallLogs.map((log) => (
                  <McpCallLogRow key={log.id} log={log} />
                ))}
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

function DefaultDisciplinePanel({ discipline }: { discipline: DefaultDiscipline | null }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<'instruction' | 'text' | null>(null);

  if (!discipline) {
    return (
      <div className="rounded-lg border border-paper-edge bg-vellum/40 p-5">
        <p className="font-display tracking-display text-[10px] uppercase text-sepia mb-2">Default Discipline</p>
        <h3 className="font-serif text-base text-ink-brown mb-1">默认工作纪律</h3>
        <p className="font-sans text-sm text-sepia">尚未配置默认纪律。</p>
      </div>
    );
  }

  const loadingInstruction = `请先通过 N.E.I. MCP 调用 get_default_discipline，并在本轮 PEVC 工作中遵守该纪律。\n\n当前默认纪律：${discipline.title}\n详情页：https://nei-pevc.com/posts/${discipline.id}\n\n后续执行任何 Skill / Workflow 时，请保持真实、审慎、可追溯，不编造数据、事实、来源或访谈结论，并明确标注待核实事项。`;

  const copy = async (kind: 'instruction' | 'text', value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1600);
  };

  return (
    <div className="rounded-lg border-2 border-gilded/40 bg-gilded/5 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="font-display tracking-display text-[10px] uppercase text-sepia mb-2">Default Discipline</p>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="font-serif text-lg text-ink-brown">默认工作纪律</h3>
            <span className="inline-flex h-6 items-center rounded-sm border border-gilded bg-vellum px-2 font-sans text-[11px] text-leather">
              默认加载建议
            </span>
          </div>
          <Link href={`/posts/${discipline.id}`} className="font-serif text-base text-ink-brown hover:text-wax-red">
            {discipline.title}
          </Link>
          <p className="mt-2 max-w-3xl font-sans text-sm leading-6 text-leather">
            {discipline.usageNotes ||
              '约束通用 AI Agent 在一级市场任务中保持真实、审慎、可追溯和边界清晰。'}
          </p>
          <p className="mt-2 font-sans text-xs text-sepia">
            更新：<TimeText value={discipline.updatedAt} /> · MCP 工具：<code className="font-mono">get_default_discipline</code>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => copy('instruction', loadingInstruction)}>
            {copied === 'instruction' ? '已复制' : '复制加载指令'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => copy('text', discipline.text)}>
            {copied === 'text' ? '已复制' : '复制原文'}
          </Button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 items-center rounded-sm border border-paper-edge px-4 font-serif text-sm text-leather hover:text-ink-brown"
          >
            {open ? '收起原文' : '查看原文'}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 max-h-[420px] overflow-auto rounded-md border border-paper-edge bg-vellum p-4">
          <pre className="whitespace-pre-wrap font-sans text-xs leading-6 text-ink-brown">{discipline.text}</pre>
        </div>
      )}
    </div>
  );
}

function DisciplineRow({ discipline }: { discipline: DefaultDiscipline }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-paper-edge bg-vellum/70 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Link href={`/posts/${discipline.id}`} className="font-serif text-sm text-ink-brown hover:text-wax-red">
            {discipline.title}
          </Link>
          {discipline.isDefault && (
            <span className="inline-flex h-5 items-center rounded-sm border border-gilded bg-gilded/10 px-1.5 font-sans text-[10px] text-leather">
              默认
            </span>
          )}
        </div>
        <p className="font-sans text-xs leading-5 text-sepia">
          {discipline.usageNotes || '约束 Agent 工作方式的基础纪律。'}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link href={`/posts/${discipline.id}`} className="inline-flex h-8 items-center rounded-sm border border-paper-edge px-3 font-serif text-xs text-leather hover:text-ink-brown">
          查看
        </Link>
        <span className="font-mono text-[10px] text-sepia hidden sm:inline">#{discipline.id}</span>
      </div>
    </div>
  );
}

function DisciplineHint({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-paper-edge bg-vellum/45 p-4">
      <p className="font-serif text-sm text-ink-brown mb-1">{title}</p>
      <p className="font-sans text-xs leading-5 text-leather">{body}</p>
    </div>
  );
}

function FavRow({
  item, organizing, canMoveUp, canMoveDown, onNoteSave, onMoveUp, onMoveDown, onRemove,
}: {
  item: FavItem;
  organizing: boolean;
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
    <div className="group w-full min-w-0 rounded border border-paper-edge bg-vellum/60 p-3 transition-colors hover:border-sepia">
      <div className="flex items-center gap-3">
        {/* 排序按钮 */}
        {organizing && (
          <div className="flex shrink-0 flex-col gap-0.5">
            <button type="button" onClick={onMoveUp} disabled={!canMoveUp} className={cn('text-sepia hover:text-ink-brown disabled:opacity-20 transition-colors', !canMoveUp && 'cursor-default')} aria-label={`在${SCENE_LABELS[item.tagScene] || item.tagScene}中上移 ${item.title}`}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 7L6 4L9 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button type="button" onClick={onMoveDown} disabled={!canMoveDown} className={cn('text-sepia hover:text-ink-brown disabled:opacity-20 transition-colors', !canMoveDown && 'cursor-default')} aria-label={`在${SCENE_LABELS[item.tagScene] || item.tagScene}中下移 ${item.title}`}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5L6 8L9 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        )}

        {/* 标题 */}
        <Link href={`/posts/${item.postId}`} className="font-serif text-sm text-ink-brown hover:text-wax-red flex-1 min-w-0 truncate">
          {item.title}
        </Link>

        {/* 类型 */}
        {item.assetType && (
          <span className="font-mono text-[10px] text-sepia shrink-0 hidden sm:inline">{item.assetType}</span>
        )}

        {/* 操作 */}
        {organizing && (
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => { setEditing(!editing); setNoteText(item.note || ''); }} className="p-1 text-sepia transition-colors hover:text-ink-brown" aria-label={`备注 ${item.title}`}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M2 10 L2 8 L8 2 L10 4 L4 10 Z" strokeLinejoin="round" /></svg>
            </button>
            <button type="button" onClick={onRemove} className="p-1 text-sepia transition-colors hover:text-wax-red" aria-label={`取消收藏 ${item.title}`}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M1 1 L11 11 M11 1 L1 11" strokeLinecap="round" /></svg>
            </button>
          </div>
        )}
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

function MyPostRow({ post }: { post: MyPost }) {
  const sceneLabel = SCENE_LABELS[post.tagScene] || post.tagScene;
  return (
    <div className="border border-paper-edge bg-vellum/60 rounded p-3 hover:border-sepia transition-colors">
      <div className="flex items-center gap-3">
        {/* 标题 */}
        <Link href={`/posts/${post.id}`} className="font-serif text-sm text-ink-brown hover:text-wax-red flex-1 min-w-0 truncate">
          {post.title}
        </Link>

        {/* 场景 */}
        <span className="font-sans text-[11px] text-leather shrink-0 hidden sm:inline">
          {sceneLabel}
        </span>

        {/* 浏览数 + 更新时间 */}
        <span className="font-mono text-[10px] text-sepia shrink-0 hidden md:inline">
          {post.viewCount} 次浏览
        </span>
        <span className="font-mono text-[10px] text-sepia shrink-0">
          <TimeText value={post.updatedAt} />
        </span>

        {/* 编辑入口 */}
        <Link
          href={`/posts/${post.id}/edit`}
          className="text-xs text-wax-red hover:underline font-sans shrink-0"
        >
          编辑
        </Link>
      </div>
    </div>
  );
}

function McpCallLogRow({ log }: { log: McpCallLog }) {
  const toolLabel = log.tool === 'search_skills'
    ? '搜索 Skill'
    : log.tool === 'get_skill'
      ? '获取详情'
      : log.tool === 'list_my_skills'
        ? '列出收藏'
        : log.tool;
  return (
    <div className="flex items-center gap-3 text-xs py-1 border-b border-paper-edge/50 last:border-b-0">
      {/* 工具 */}
      <span className="font-mono text-leather shrink-0 w-24 truncate">{toolLabel}</span>
      {/* Post 链接 */}
      {log.postId ? (
        <Link href={`/posts/${log.postId}`} className="text-ink-brown hover:text-wax-red underline shrink-0">
          #{log.postId}
        </Link>
      ) : (
        <span className="font-sans text-sepia/60 shrink-0">—</span>
      )}
      {/* 客户端 */}
      {log.clientName && (
        <span className="font-sans text-sepia truncate flex-1 min-w-0 hidden sm:inline" title={log.clientName}>
          {log.clientName}
        </span>
      )}
      {/* 时间 */}
      <TimeText value={log.createdAt} className="font-mono text-sepia shrink-0 ml-auto" />
    </div>
  );
}
