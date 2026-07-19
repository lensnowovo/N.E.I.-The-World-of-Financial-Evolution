'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SCENE_TAGS } from '@/lib/tags';

type Solution = {
  id: number;
  status: string;
  note: string | null;
  createdAt: string;
  author: { id: number; nickname: string };
  post: { id: number; title: string; mcpApproved: boolean; assetType: string | null };
};

type RequestItem = {
  id: number;
  title: string;
  description: string;
  scene: string;
  sceneLabel: string;
  source: string;
  status: string;
  acceptanceCriteria: string[];
  requester: { id: number; nickname: string; role: string };
  claimedBy: { id: number; nickname: string } | null;
  supportCount: number;
  supportedByMe: boolean;
  createdAt: string;
  updatedAt: string;
  solutions: Solution[];
};

type Props = {
  initialRequests: RequestItem[];
  currentUser: { id: number; nickname: string; isAdmin: boolean } | null;
  mySkills: Array<{ id: number; title: string }>;
  initialPublishOpen?: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  open: '待认领',
  claimed: '解决中',
  solved: '已解决',
  closed: '已关闭',
};

export function SkillRequestBoard({ initialRequests, currentUser, mySkills, initialPublishOpen = false }: Props) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [selectedId, setSelectedId] = useState(initialRequests[0]?.id ?? 0);
  const [status, setStatus] = useState('all');
  const [scene, setScene] = useState('all');
  const [sort, setSort] = useState<'popular' | 'latest'>('popular');
  const [query, setQuery] = useState('');
  const [publishOpen, setPublishOpen] = useState(initialPublishOpen);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const items = requests.filter((item) => {
      if (status !== 'all' && item.status !== status) return false;
      if (scene !== 'all' && item.scene !== scene) return false;
      return !needle || `${item.title} ${item.description} ${item.sceneLabel}`.toLowerCase().includes(needle);
    });
    return [...items].sort((a, b) =>
      sort === 'popular'
        ? b.supportCount - a.supportCount || b.id - a.id
        : b.id - a.id,
    );
  }, [query, requests, scene, sort, status]);

  const selected = requests.find((item) => item.id === selectedId) ?? visible[0] ?? null;

  function requireLogin() {
    if (currentUser) return true;
    router.push(`/login?next=${encodeURIComponent('/requests')}`);
    return false;
  }

  async function refresh(preferredId = selected?.id ?? 0) {
    const response = await fetch('/api/skill-requests?sort=popular&limit=80', { cache: 'no-store' });
    const data = await readJson(response);
    if (!response.ok) throw new Error(data.error || '读取需求失败');
    setRequests(data.items || []);
    if (preferredId) setSelectedId(preferredId);
  }

  async function act(url: string, options: RequestInit = {}) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(url, options);
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || '操作失败');
      await refresh();
      return data;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function support() {
    if (!selected || !requireLogin()) return;
    await act(`/api/skill-requests/${selected.id}/support`, { method: 'POST' });
  }

  async function claim() {
    if (!selected || !requireLogin()) return;
    const result = await act(`/api/skill-requests/${selected.id}/claim`, { method: 'POST' });
    if (result) setMessage('已认领。完成 Skill 后回到这里提交解决方案。');
  }

  async function accept(solutionId: number) {
    if (!selected || !requireLogin()) return;
    const result = await act(`/api/skill-requests/${selected.id}/solutions/${solutionId}`, { method: 'PATCH' });
    if (result) setMessage('已采纳这份解决方案。');
  }

  return (
    <div className="pb-10">
      <section className="mb-7 grid gap-7 border-b border-paper-edge pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="font-display text-[10px] uppercase tracking-[0.22em] text-gilded">Skill Request Board</p>
          <h1 className="mt-2 font-serif text-4xl font-normal text-ink-brown sm:text-5xl">提出需求</h1>
          <p className="mt-3 max-w-3xl font-sans text-sm leading-7 text-leather">
            没找到合适的 Skill，就把真实工作需求留在这里。其他贡献者可以认领，并用已经公开的 Skill 提交解决方案。
          </p>
        </div>
        <div className="flex items-center gap-6 border-l border-ink-brown/45 pl-5 font-serif text-sm text-leather">
          <Stat value={requests.filter((item) => item.status === 'open').length} label="等待解答" />
          <Stat value={requests.filter((item) => item.status === 'solved').length} label="已有解法" />
          <button
            onClick={() => (requireLogin() ? setPublishOpen(true) : undefined)}
            className="rounded-md bg-ink-brown px-5 py-3 text-vellum transition-colors hover:bg-wax-red"
          >
            发布需求
          </button>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(500px,.86fr)_minmax(560px,1.14fr)]">
        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {[
              ['all', '全部'],
              ['open', '待认领'],
              ['claimed', '解决中'],
              ['solved', '已解决'],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setStatus(value)}
                className={`h-9 rounded-md border px-3 font-serif text-xs transition-colors ${status === value ? 'border-ink-brown bg-ink-brown text-vellum' : 'border-paper-edge bg-vellum/70 text-leather hover:border-gilded'}`}
              >
                {label}
              </button>
            ))}
            <select
              value={scene}
              onChange={(event) => setScene(event.target.value)}
              className="h-9 rounded-md border border-paper-edge bg-vellum/70 px-2 font-serif text-xs text-leather"
              aria-label="按工作场景筛选"
            >
              <option value="all">全部场景</option>
              {SCENE_TAGS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索需求…"
              className="ml-auto h-9 w-40 border-0 border-b border-paper-edge bg-transparent px-1 font-serif text-sm outline-none placeholder:italic placeholder:text-sepia/60"
            />
            <button onClick={() => setSort(sort === 'popular' ? 'latest' : 'popular')} className="font-serif text-xs italic text-sepia hover:text-wax-red">
              {sort === 'popular' ? '热门优先' : '最新优先'}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {visible.map((item, index) => (
              <button
                key={item.id}
                id={`request-${item.id}`}
                onClick={() => setSelectedId(item.id)}
                className={`relative min-h-[210px] overflow-hidden rounded-lg border bg-vellum/80 text-left transition-all hover:-translate-y-0.5 hover:border-gilded hover:shadow-card ${selected?.id === item.id ? 'border-ink-brown shadow-[5px_6px_0_rgba(61,46,31,.09)]' : 'border-paper-edge'}`}
                style={{ animationDelay: `${Math.min(index * 30, 240)}ms` }}
              >
                {selected?.id === item.id && <span className="absolute inset-y-0 left-0 w-1 bg-gilded" />}
                <div className="flex h-11 items-center gap-2 border-b border-paper-edge px-4 font-display text-[9px] uppercase tracking-display text-gilded">
                  <span>{String(item.id).padStart(3, '0')}</span>
                  <span className="rounded border border-paper-edge px-1.5 py-0.5 font-sans normal-case tracking-normal text-sepia">{item.sceneLabel}</span>
                  <span className="ml-auto text-sepia">{item.source === 'mcp' ? 'MCP' : '社区'}</span>
                </div>
                <div className="px-4 py-4">
                  <h2 className="font-serif text-lg font-normal leading-7 text-ink-brown">{item.title}</h2>
                  <p className="mt-2 line-clamp-2 font-sans text-xs leading-6 text-leather">{item.description}</p>
                </div>
                <div className="absolute inset-x-4 bottom-3 flex items-center gap-4 font-mono text-[10px] text-sepia">
                  <span>☆ {item.supportCount}</span>
                  <span>{item.solutions.length} 个方案</span>
                  <span className="ml-auto flex items-center gap-1.5 font-sans">
                    <i className={`h-1.5 w-1.5 rounded-full ${item.status === 'solved' ? 'bg-ink-brown' : item.status === 'claimed' ? 'bg-moss shadow-[0_0_7px_var(--moss)]' : 'bg-gilded shadow-[0_0_7px_var(--gilded)]'}`} />
                    {STATUS_LABEL[item.status] || item.status}
                  </span>
                </div>
              </button>
            ))}
            <button
              onClick={() => (requireLogin() ? setPublishOpen(true) : undefined)}
              className="grid min-h-[210px] place-items-center rounded-lg border border-dashed border-sepia/35 bg-linen/25 text-center text-leather hover:border-gilded"
            >
              <span><b className="block font-serif text-lg font-normal">没有你要找的？</b><i className="mt-2 block font-serif text-xs">发布一个新的 Skill 需求 →</i></span>
            </button>
          </div>
          {visible.length === 0 && <p className="py-16 text-center font-serif italic text-sepia">当前筛选下还没有需求。</p>}
        </section>

        <aside className="sticky top-24 min-h-[660px] overflow-hidden rounded-xl border border-ink-brown/55 bg-linen/85 shadow-card backdrop-blur-[2px]">
          <div className="flex h-[52px] items-center bg-ink-brown px-5 py-4 text-vellum">
            <span className="font-display text-[10px] uppercase tracking-[0.2em] text-[#d6b86f]">Resolution Board</span>
            <span className="ml-auto font-mono text-[10px]">{selected ? `NO. ${String(selected.id).padStart(3, '0')} · ${STATUS_LABEL[selected.status]}` : 'WAITING'}</span>
          </div>
          {selected ? (
            <div className="relative p-5">
              <div className="rounded-lg border border-paper-edge bg-vellum p-5 shadow-[0_10px_24px_rgba(61,46,31,.07)]">
                <div className="flex font-display text-[9px] uppercase tracking-display text-gilded">
                  <span>Request {String(selected.id).padStart(3, '0')}</span>
                  <span className="ml-auto text-sepia">{selected.requester.nickname} 发布</span>
                </div>
                <h2 className="mt-3 font-serif text-2xl font-normal leading-9 text-ink-brown">{selected.title}</h2>
                <p className="mt-2 font-sans text-xs leading-6 text-leather">{selected.description}</p>
                <div className="mt-4 grid grid-cols-3 border-t border-paper-edge pt-3">
                  <Signal label="DEMAND" value={`${selected.supportCount} 人需要`} />
                  <Signal label="OWNER" value={selected.claimedBy?.nickname || '等待认领'} />
                  <Signal label="SCENE" value={selected.sceneLabel} />
                </div>
              </div>

              <div className="my-4 flex flex-wrap gap-2">
                <button disabled={busy} onClick={support} className={`rounded-md border px-3 py-2 font-serif text-xs ${selected.supportedByMe ? 'border-gilded bg-[#eadfbe] text-ink-brown' : 'border-ink-brown bg-ink-brown text-vellum hover:bg-wax-red'}`}>
                  {selected.supportedByMe ? '★ 已加入需求' : '☆ 我也需要'}
                </button>
                {selected.status === 'open' && selected.requester.id !== currentUser?.id && (
                  <button disabled={busy} onClick={claim} className="rounded-md border border-ink-brown px-3 py-2 font-serif text-xs hover:bg-vellum">认领需求</button>
                )}
                {selected.status !== 'solved' && selected.status !== 'closed' && (
                  <button disabled={busy} onClick={() => (requireLogin() ? setSolutionOpen(true) : undefined)} className="rounded-md border border-ink-brown px-3 py-2 font-serif text-xs hover:bg-vellum">提交解决方案</button>
                )}
              </div>
              {message && <p className="mb-3 border-l-2 border-gilded pl-3 font-sans text-xs text-leather">{message}</p>}

              <p className="mb-3 font-display text-[9px] uppercase tracking-[0.18em] text-gilded">Solution Map · 解决路径</p>
              <div className="relative space-y-3 pl-7 before:absolute before:bottom-3 before:left-2 before:top-2 before:w-px before:bg-gradient-to-b before:from-gilded before:to-gilded/10">
                {selected.solutions.length > 0 ? selected.solutions.map((solution, index) => (
                  <div key={solution.id} className="relative before:absolute before:left-[-23px] before:top-6 before:h-2 before:w-2 before:rounded-full before:border before:border-gilded before:bg-parchment before:shadow-[0_0_0_4px_rgba(168,131,57,.08)]">
                    <div className={`rounded-lg border bg-vellum/85 p-4 transition-transform hover:translate-x-1 ${solution.status === 'accepted' ? 'border-moss' : 'border-paper-edge'}`}>
                      <div className="flex font-display text-[8px] uppercase tracking-display text-sepia">
                        <span>Solution {String(index + 1).padStart(2, '0')}</span>
                        <span className="ml-auto">{solution.status === 'accepted' ? '已采纳' : '待评估'}</span>
                      </div>
                      <Link href={`/posts/${solution.post.id}`} className="mt-2 block font-serif text-base text-ink-brown hover:text-wax-red">{solution.post.title}</Link>
                      {solution.note && <p className="mt-1 font-sans text-[11px] leading-5 text-leather">{solution.note}</p>}
                      <div className="mt-3 flex items-center border-t border-paper-edge pt-2 font-sans text-[10px] text-sepia">
                        <span>{solution.author.nickname}</span>
                        {solution.post.mcpApproved && <span className="ml-2 rounded border border-moss px-1 text-moss">MCP Ready</span>}
                        <Link className="ml-auto font-serif italic" href={`/posts/${solution.post.id}`}>查看 Skill →</Link>
                      </div>
                      {(currentUser?.id === selected.requester.id || currentUser?.isAdmin) && selected.status !== 'solved' && (
                        <button disabled={busy} onClick={() => accept(solution.id)} className="mt-3 font-serif text-xs text-moss underline decoration-paper-edge underline-offset-4">采纳这份解法</button>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="relative before:absolute before:left-[-23px] before:top-6 before:h-2 before:w-2 before:rounded-full before:border before:border-gilded before:bg-parchment">
                    <div className="rounded-lg border border-dashed border-paper-edge bg-vellum/55 p-5 text-center">
                      <p className="font-serif text-base text-ink-brown">等待第一份解决方案</p>
                      <p className="mt-1 font-sans text-[11px] text-sepia">认领这项工作，把成熟方法整理成 Skill。</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 border-t border-paper-edge px-1 pt-3">
                <p className="font-display text-[8px] uppercase tracking-display text-sepia">Acceptance Criteria</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(selected.acceptanceCriteria.length ? selected.acceptanceCriteria : ['能直接复用', '说明适用场景', '给出预期产出']).map((criterion) => (
                    <span key={criterion} className="rounded border border-paper-edge bg-vellum/60 px-2 py-1 font-sans text-[10px] text-leather">{criterion}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid min-h-[600px] place-items-center p-10 text-center font-serif italic text-sepia">从左侧选择一项需求</div>
          )}
        </aside>
      </div>

      {publishOpen && <PublishModal busy={busy} onClose={() => setPublishOpen(false)} onSubmit={async (body) => {
        setBusy(true); setMessage('');
        try {
          const response = await fetch('/api/skill-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          const data = await readJson(response);
          if (!response.ok) throw new Error(data.error || '发布失败');
          await refresh(data.id);
          setPublishOpen(false);
          setMessage('需求已发布。');
        } catch (error) { setMessage(error instanceof Error ? error.message : '发布失败'); }
        finally { setBusy(false); }
      }} />}

      {solutionOpen && selected && <SolutionModal skills={mySkills} busy={busy} onClose={() => setSolutionOpen(false)} onSubmit={async (body) => {
        const result = await act(`/api/skill-requests/${selected.id}/solutions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (result) { setSolutionOpen(false); setMessage('解决方案已提交。'); }
      }} />}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return <span><b className="block font-serif text-2xl font-normal text-ink-brown">{value}</b><small className="font-sans text-[10px] text-sepia">{label}</small></span>;
}

function Signal({ label, value }: { label: string; value: string }) {
  return <span><small className="block font-display text-[8px] tracking-display text-sepia">{label}</small><b className="mt-1 block truncate font-serif text-sm font-normal text-ink-brown">{value}</b></span>;
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-ink-brown/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="w-full max-w-xl rounded-xl border border-gilded bg-vellum p-6 shadow-2xl">{children}</div></div>;
}

function PublishModal({ busy, onClose, onSubmit }: { busy: boolean; onClose: () => void; onSubmit: (body: Record<string, unknown>) => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scene, setScene] = useState('business-dd');
  const [criteria, setCriteria] = useState('');
  return <ModalShell onClose={onClose}><p className="font-display text-[9px] uppercase tracking-display text-gilded">Publish a Request</p><h2 className="mt-2 font-serif text-3xl font-normal">发布 Skill 需求</h2><p className="mt-2 font-sans text-xs leading-6 text-sepia">只描述需要的方法和理想产出，不要填写真实项目名称、BP 正文、财务数据或其他敏感材料。</p><form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); void onSubmit({ title, description, scene, acceptanceCriteria: criteria.split(/\n|，|,/).map((item) => item.trim()).filter(Boolean) }); }}><Field label="需求标题"><input required minLength={5} maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：需要一个客户访谈提纲生成 Skill" /></Field><Field label="工作场景"><select value={scene} onChange={(e) => setScene(e.target.value)}>{SCENE_TAGS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field><Field label="需求说明"><textarea required minLength={12} maxLength={1200} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="说清楚什么时候用、希望解决什么问题。" /></Field><Field label="验收标准（可选，用逗号或换行分隔）"><textarea value={criteria} onChange={(e) => setCriteria(e.target.value)} placeholder="例如：覆盖客户/供应商/专家；能直接复制；包含追问逻辑" /></Field><ModalActions busy={busy} onClose={onClose} submit="发布需求" /></form></ModalShell>;
}

function SolutionModal({ skills, busy, onClose, onSubmit }: { skills: Props['mySkills']; busy: boolean; onClose: () => void; onSubmit: (body: Record<string, unknown>) => Promise<void> }) {
  const [postId, setPostId] = useState(skills[0]?.id ? String(skills[0].id) : '');
  const [note, setNote] = useState('');
  return <ModalShell onClose={onClose}><p className="font-display text-[9px] uppercase tracking-display text-gilded">Submit a Solution</p><h2 className="mt-2 font-serif text-3xl font-normal">提交解决方案</h2><p className="mt-2 font-sans text-xs leading-6 text-sepia">解法必须关联一条已经公开的站内 Skill。这样需求板只索引经过平台内容流程的完整方法。</p>{skills.length ? <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); void onSubmit({ postId: Number(postId), note }); }}><Field label="选择我的公开 Skill"><select value={postId} onChange={(e) => setPostId(e.target.value)}>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.title}</option>)}</select></Field><Field label="为什么它能解决这个需求（可选）"><textarea maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="简单说明覆盖范围、适用对象或使用方法。" /></Field><ModalActions busy={busy} onClose={onClose} submit="提交解法" /></form> : <div className="mt-5 rounded-lg border border-dashed border-paper-edge p-6 text-center"><p className="font-serif text-lg">你还没有公开 Skill</p><Link href="/publish" className="mt-3 inline-flex rounded-md bg-ink-brown px-4 py-2 font-serif text-sm text-vellum">先发布一个 Skill →</Link></div>}</ModalShell>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block font-sans text-xs text-leather"><span className="mb-1.5 block">{label}</span><span className="block [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:border-paper-edge [&_input]:bg-parchment [&_input]:p-3 [&_select]:w-full [&_select]:rounded-md [&_select]:border [&_select]:border-paper-edge [&_select]:bg-parchment [&_select]:p-3 [&_textarea]:min-h-24 [&_textarea]:w-full [&_textarea]:rounded-md [&_textarea]:border [&_textarea]:border-paper-edge [&_textarea]:bg-parchment [&_textarea]:p-3">{children}</span></label>;
}

function ModalActions({ busy, onClose, submit }: { busy: boolean; onClose: () => void; submit: string }) {
  return <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="rounded-md border border-paper-edge px-4 py-2 font-serif text-sm">取消</button><button disabled={busy} type="submit" className="rounded-md bg-ink-brown px-4 py-2 font-serif text-sm text-vellum disabled:opacity-50">{busy ? '处理中…' : submit}</button></div>;
}

async function readJson(response: Response): Promise<Record<string, any>> {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { error: `服务器返回了无法解析的响应（${response.status}）` }; }
}
