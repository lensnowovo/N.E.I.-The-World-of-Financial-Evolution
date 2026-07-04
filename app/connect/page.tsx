'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PUBLIC_BASE_URL } from '@/lib/public-url';
import { McpQuickSetupPanel } from '@/components/mcp/McpQuickSetupPanel';
import {
  McpOnboardingChecklist,
  type McpOnboardingStatus,
} from '@/components/mcp/McpOnboardingChecklist';

type ConnectProfile = {
  id: number;
  hasMcpToken: boolean;
};

export default function ConnectPage() {
  const [profile, setProfile] = useState<ConnectProfile | null>(null);
  const [mcpStatus, setMcpStatus] = useState<McpOnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const [mcpToken, setMcpToken] = useState('');
  const [mcpGenerating, setMcpGenerating] = useState(false);

  const mcpUrl = `${PUBLIC_BASE_URL}/api/mcp`;
  const connectUrl = `${PUBLIC_BASE_URL}/connect`;

  useEffect(() => {
    Promise.all([
      fetch('/api/users/me').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/users/me/mcp-status').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([profileData, statusData]) => {
        setProfile(profileData);
        setMcpStatus(statusData);
      })
      .finally(() => setLoading(false));
  }, []);

  const generateMcpToken = async () => {
    setMcpGenerating(true);
    const res = await fetch('/api/users/me/mcp-token', { method: 'POST' });
    const data = await res.json();
    setMcpGenerating(false);

    if (res.ok) {
      setMcpToken(data.token);
      setProfile((p) => (p ? { ...p, hasMcpToken: true } : p));
      setMcpStatus((s) => (s ? { ...s, hasMcpToken: true } : s));
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-prose py-20 text-center">
        <p className="font-serif italic text-sm text-sepia">正在检查登录状态…</p>
      </div>
    );
  }

  if (!profile) return <ConnectGuestState />;

  return (
    <div className="mx-auto max-w-page px-4 sm:px-6 py-8">
      <div className="mb-6">
        <Link href={`/profile/${profile.id}`} className="inline-flex items-center gap-1.5 font-serif italic text-sm text-sepia hover:text-ink-brown transition-colors">
          ← 返回个人主页
        </Link>
      </div>

      <header className="mb-8 max-w-3xl border-b border-paper-edge pb-5">
        <p className="font-display tracking-display text-[11px] text-sepia uppercase mb-1">
          Connect N.E.I.
        </p>
        <h1 className="font-serif text-3xl text-ink-brown">连接你的 AI 客户端</h1>
        <p className="font-serif italic text-sm text-leather mt-2 leading-7">
          最短路径：生成 Token → 复制配置包 → 粘贴到 Claude Code、Codex、Workbuddy 或其它 Agent 客户端 → 调用 search_skills 搜全库。收藏只是常用库，不是使用前置条件。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="space-y-8">
          <McpQuickSetupPanel
            token={mcpToken}
            hasExistingToken={profile.hasMcpToken}
            generating={mcpGenerating}
            mcpUrl={mcpUrl}
            connectUrl={connectUrl}
            onGenerate={generateMcpToken}
          />
        </main>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          {mcpStatus && <McpOnboardingChecklist status={mcpStatus} compact />}

          <ClientSupportCard />

          <div className="rounded-md border border-paper-edge bg-vellum p-4">
            <p className="font-display tracking-display text-[10px] uppercase text-sepia mb-2">
              安全边界
            </p>
            <p className="font-sans text-xs leading-6 text-leather">
              N.E.I. MCP 只分发 Skill / Workflow，不读取本地文件，不上传 BP、财务模型、投委会材料或 LP 名单。
              Token 可随时重新生成。
            </p>
            <Link href="/security" className="mt-3 inline-flex font-serif text-sm italic text-leather hover:text-ink-brown">
              查看安全原则 →
            </Link>
          </div>

          <div className="rounded-md border border-paper-edge bg-vellum/60 p-4">
            <p className="font-display tracking-display text-[10px] uppercase text-sepia mb-2">
              调通后怎么用
            </p>
            <ul className="space-y-2 font-sans text-xs leading-6 text-leather">
              <li>1. 在客户端调用 <code className="font-mono">search_skills</code> 搜全库。</li>
              <li>2. 调用 <code className="font-mono">recommend_skills_for_task</code> 让 Agent 按任务推荐。</li>
              <li>3. 遇到好用的 Skill，再用 <code className="font-mono">favorite_skill</code> 收藏沉淀。</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ConnectGuestState() {
  return (
    <div className="mx-auto max-w-prose px-4 sm:px-6 py-12">
      <header className="mb-8 border-b border-paper-edge pb-5">
        <p className="font-display tracking-display text-[11px] text-sepia uppercase mb-1">
          Connect N.E.I.
        </p>
        <h1 className="font-serif text-3xl text-ink-brown">登录后连接你的 AI 客户端</h1>
        <p className="font-serif italic text-sm text-leather mt-2 leading-7">
          登录后生成 MCP Token，一键复制配置包，把 Skill Library 接入 Claude Code、Codex、Workbuddy 或其它 Agent 客户端。
        </p>
      </header>

      <div className="rounded-md border border-gilded/40 bg-gilded/5 p-5">
        <h2 className="font-serif text-xl text-ink-brown mb-2">MCP 是什么？</h2>
        <p className="font-sans text-sm text-leather leading-7">
          MCP 让 AI 客户端读取你收藏的 N.E.I. Skill。N.E.I. 只分发 Skill / Workflow，
          不读取本地文件，不上传你的 BP、财务模型或投委会材料。
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/login?next=/connect" className="inline-flex h-10 items-center rounded-sm bg-ink-brown px-5 font-serif text-sm text-vellum transition-colors hover:bg-wax-red">
            登录后生成配置包
          </Link>
          <Link href="/register" className="inline-flex h-10 items-center rounded-sm border border-ink-brown px-5 font-serif text-sm text-ink-brown transition-colors hover:bg-ink-brown hover:text-vellum">
            注册账号
          </Link>
          <Link href="/mcp" className="inline-flex h-10 items-center px-2 font-serif text-sm italic text-leather transition-colors hover:text-wax-red">
            查看原理与排障 →
          </Link>
        </div>
      </div>
    </div>
  );
}

function ClientSupportCard() {
  return (
    <div className="rounded-md border border-paper-edge bg-vellum/60 p-4">
      <p className="font-display tracking-display text-[10px] uppercase text-sepia mb-2">
        推荐客户端
      </p>
      <div className="space-y-2 font-sans text-xs leading-6 text-leather">
        <p>
          已按当前配置口径优先支持：<span className="text-ink-brown">Claude Code、Codex、Workbuddy 或其它 Agent 客户端</span>。
        </p>
        <p>
          豆包目前不作为推荐连接客户端展示；实测连接不稳定，等有明确可用的 MCP Client 配置方式后再补教程。
        </p>
      </div>
    </div>
  );
}
