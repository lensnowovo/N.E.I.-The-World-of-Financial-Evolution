'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
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
    <div className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6">
      <ConnectHero tokenCount={tokens.length} connectedCount={connectedCount} maxActive={maxActive} />

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

function ConnectHero({ tokenCount, connectedCount, maxActive }: { tokenCount: number; connectedCount: number; maxActive: number }) {
  return (
    <header className="mcp-access-hero relative overflow-hidden border-b border-paper-edge pb-8 pt-2 sm:pb-10">
      <Link href="/" className="relative z-10 font-serif text-sm italic text-sepia transition-colors hover:text-ink-brown">← 返回 Skills 目录</Link>

      <div className="relative mt-8 grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-4">
        <div className="relative z-10">
          <p className="font-display text-[10px] uppercase tracking-[0.22em] text-gilded">N.E.I. MCP / Client Setup</p>
          <h1 className="mt-3 max-w-2xl font-serif text-4xl leading-[1.08] text-ink-brown sm:text-5xl lg:whitespace-nowrap lg:text-[50px]">
            把 N.E.I. 接入你的 Agent
          </h1>
          <p className="mt-5 max-w-xl font-sans text-sm leading-7 text-leather">
            让 Codex、Claude Code 和 WorkBuddy 直接搜索 N.E.I. Skills，并读取你的收藏。
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <a
              href="#new-connection"
              className="inline-flex min-h-12 items-center gap-8 bg-moss px-6 font-serif text-sm text-vellum transition-colors hover:bg-ink-brown hover:text-vellum"
            >
              连接新 Agent <span aria-hidden="true">→</span>
            </a>
            <Link href="/mcp" className="font-serif text-sm italic text-sepia transition-colors hover:text-wax-red">
              查看接入方法 →
            </Link>
          </div>

          <ol className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 font-sans text-xs text-leather" aria-label="连接步骤">
            <HeroStep number="1" label="选择客户端" />
            <span className="text-gilded/70" aria-hidden="true">→</span>
            <HeroStep number="2" label="复制配置" />
            <span className="text-gilded/70" aria-hidden="true">→</span>
            <HeroStep number="3" label="完成连接" />
          </ol>
        </div>

        <figure className="relative -mx-5 sm:mx-0" aria-label="N.E.I. Skills 通过 MCP 连接到 Codex、Claude Code 和 WorkBuddy">
          <Image
            src="/mcp-connection-flow.png"
            alt="N.E.I. Skills 库通过 MCP 连接台流向 Codex、Claude Code 和 WorkBuddy"
            width={1637}
            height={960}
            priority
            className="h-auto w-full mix-blend-multiply"
          />
        </figure>
      </div>

      <div className="relative z-10 mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-paper-edge/80 pt-4 font-sans text-[11px] text-sepia">
        <p>连接状态来自真实 MCP 工具调用</p>
        <p className="font-mono tracking-[0.08em]">
          {connectedCount} CONNECTED · {tokenCount}/{maxActive} ACTIVE
        </p>
      </div>
    </header>
  );
}

function HeroStep({ number, label }: { number: string; label: string }) {
  return (
    <li className="inline-flex items-center gap-2">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-moss/70 font-mono text-[10px] text-moss">{number}</span>
      <span>{label}</span>
    </li>
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
