'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PUBLIC_BASE_URL } from '@/lib/public-url';
import {
  McpConnectionConsole,
  type McpTokenView,
  type NewMcpCredential,
} from '@/components/mcp/McpConnectionConsole';

type ConnectProfile = { id: number };
type TokenListResponse = { items: McpTokenView[]; activeCount: number; maxActive: number };

export default function ConnectPage() {
  const [profile, setProfile] = useState<ConnectProfile | null>(null);
  const [tokens, setTokens] = useState<McpTokenView[]>([]);
  const [maxActive, setMaxActive] = useState(8);
  const [newCredential, setNewCredential] = useState<NewMcpCredential | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mcpUrl = `${PUBLIC_BASE_URL}/api/mcp`;

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/users/me', { cache: 'no-store' }),
      fetch('/api/users/me/mcp-tokens', { cache: 'no-store' }),
    ])
      .then(async ([profileRes, tokenRes]) => {
        if (!active) return;
        if (!profileRes.ok) {
          setProfile(null);
          return;
        }
        const profileData = await readResponseObject(profileRes);
        setProfile(profileData as ConnectProfile);
        if (!tokenRes.ok) throw new Error('连接凭证读取失败，请刷新页面重试。');
        const tokenData = (await readResponseObject(tokenRes)) as TokenListResponse;
        if (!Array.isArray(tokenData.items)) throw new Error('连接凭证返回格式异常，请刷新页面重试。');
        setTokens(tokenData.items);
        setMaxActive(tokenData.maxActive);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : '页面加载失败，请稍后重试。');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const createToken = async (name: string, clientType: string) => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/users/me/mcp-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, clientType }),
      });
      const data = await readResponseObject(res);
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : `Token 创建失败（${res.status}）`);
      if (typeof data.token !== 'string' || !data.item) throw new Error('Token 创建接口未返回凭证，请稍后重试。');
      const credential = data as NewMcpCredential;
      setNewCredential(credential);
      setTokens((current) => [credential.item, ...current]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Token 创建失败，请稍后重试。');
    } finally {
      setCreating(false);
    }
  };

  const revokeToken = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/users/me/mcp-tokens/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await readResponseObject(res);
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : `撤销失败（${res.status}）`);
      setTokens((current) => current.filter((token) => token.id !== id));
      if (newCredential?.item.id === id) setNewCredential(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '撤销失败，请稍后重试。');
    }
  };

  if (loading) return <ConnectLoadingState />;
  if (!profile) return <ConnectGuestState />;

  const connectedCount = tokens.filter((token) => token.connected).length;

  return (
    <div className="mx-auto max-w-page px-4 py-8 sm:px-6">
      <ConnectHero tokenCount={tokens.length} connectedCount={connectedCount} />

      <div className="mt-7">
        <McpConnectionConsole
          tokens={tokens}
          maxActive={maxActive}
          newCredential={newCredential}
          creating={creating}
          error={error}
          mcpUrl={mcpUrl}
          onCreate={createToken}
          onRevoke={revokeToken}
        />
      </div>

      <section className="mt-8 grid gap-4 border-t border-paper-edge pt-6 md:grid-cols-3">
        <InfoCard index="01" title="只分发方法" text="N.E.I. MCP 返回 Skill 与 Workflow，不读取本地文件，也不上传项目材料。" href="/security" link="安全边界" />
        <InfoCard index="02" title="全库先搜索" text="收藏不是使用前置。让 Agent 先调用 search_skills，再把真正好用的 Skill 收藏沉淀。" href="/mcp" link="工具与排障" />
        <InfoCard index="03" title="外部信息另接" text="论文、网页、市场和工程数据来自独立连接器；接入前先核对权限与数据流向。" href="/mcp-library" link="浏览 MCP 库" />
      </section>
    </div>
  );
}

function ConnectHero({ tokenCount, connectedCount }: { tokenCount: number; connectedCount: number }) {
  return (
    <header className="mcp-access-hero relative overflow-hidden border-b border-paper-edge pb-7 pt-2">
      <div className="relative grid gap-6 lg:grid-cols-[1fr_350px] lg:items-end">
        <div>
          <Link href="/" className="font-serif text-sm italic text-sepia transition-colors hover:text-ink-brown">← 返回 Skills 目录</Link>
          <p className="mt-7 font-display text-[10px] uppercase tracking-[0.22em] text-gilded">N.E.I. MCP / Client Setup</p>
          <h1 className="mt-2 max-w-4xl font-serif text-4xl leading-[1.08] text-ink-brown sm:text-5xl">连接 N.E.I. MCP</h1>
          <p className="mt-4 max-w-2xl font-sans text-sm leading-7 text-leather">
            为 Codex、Claude Code、Workbuddy 分别创建 Token。多个客户端可以同时使用，互不影响。
          </p>
        </div>
        <div className="mcp-access-brief relative border border-gilded/35 bg-parchment/55 px-5 py-4 backdrop-blur-[2px]">
          <div className="flex items-center justify-between gap-4 border-b border-gilded/25 pb-3">
            <p className="font-display text-[9px] uppercase tracking-[0.18em] text-sepia">Connection status</p>
            <span className="font-mono text-[9px] text-gilded">N.E.I. / MCP</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-5">
            <HeroConnectionStat label="有效 Token" value={tokenCount} />
            <HeroConnectionStat label="已验证连接" value={connectedCount} active={connectedCount > 0} />
          </div>
          <p className="mt-4 font-sans text-[11px] leading-5 text-leather">状态来自真实 MCP 请求，不用生成 Token 代替连接成功。</p>
        </div>
      </div>
    </header>
  );
}

function HeroConnectionStat({ label, value, active = false }: { label: string; value: number; active?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${active ? 'mcp-signal-dot bg-moss' : 'bg-gilded/55'}`} />
        <span className="font-serif text-3xl text-ink-brown">{value}</span>
      </div>
      <p className="mt-1 font-sans text-[11px] text-sepia">{label}</p>
    </div>
  );
}

function InfoCard({ index, title, text, href, link }: { index: string; title: string; text: string; href: string; link: string }) {
  return (
    <article className="group border-l border-gilded/35 px-4 py-2 transition-colors hover:border-gilded">
      <p className="font-mono text-[10px] text-gilded">{index}</p>
      <h2 className="mt-2 font-serif text-lg text-ink-brown">{title}</h2>
      <p className="mt-2 font-sans text-xs leading-6 text-leather">{text}</p>
      <Link href={href} className="mt-3 inline-flex font-serif text-xs italic text-sepia transition-colors group-hover:text-wax-red">{link} →</Link>
    </article>
  );
}

function ConnectLoadingState() {
  return (
    <div className="mx-auto max-w-page px-4 py-12 sm:px-6" aria-busy="true" aria-label="正在读取连接状态">
      <div className="h-3 w-32 animate-pulse bg-paper-edge" />
      <div className="mt-7 h-12 max-w-2xl animate-pulse bg-paper-edge/70" />
      <div className="mt-4 h-5 max-w-xl animate-pulse bg-paper-edge/45" />
      <div className="mt-10 h-[420px] animate-pulse border border-paper-edge bg-vellum/40" />
    </div>
  );
}

function ConnectGuestState() {
  return (
    <div className="mx-auto max-w-page px-4 py-12 sm:px-6">
      <section className="relative overflow-hidden border border-paper-edge bg-vellum/72 p-6 sm:p-10">
        <div className="mcp-connect-orbit" aria-hidden="true" />
        <div className="relative max-w-2xl">
          <p className="font-display text-[10px] uppercase tracking-[0.2em] text-gilded">Agent Access</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-ink-brown">登录后，为每个 AI 客户端创建独立 Token</h1>
          <p className="mt-4 font-sans text-sm leading-7 text-leather">Token 只在创建时显示明文，可独立撤销。N.E.I. 只分发 Skill / Workflow，不读取本地文件。</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login?next=/connect" className="inline-flex h-11 items-center bg-ink-brown px-5 font-serif text-sm text-vellum transition-colors hover:bg-wax-red">登录并连接</Link>
            <Link href="/register" className="inline-flex h-11 items-center border border-ink-brown px-5 font-serif text-sm text-ink-brown transition-colors hover:bg-ink-brown hover:text-vellum">注册账号</Link>
            <Link href="/mcp" className="inline-flex h-11 items-center px-2 font-serif text-sm italic text-leather hover:text-wax-red">查看原理与排障 →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

async function readResponseObject(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}
