'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  McpOnboardingChecklist,
  type McpOnboardingStatus,
} from '@/components/mcp/McpOnboardingChecklist';

type ConnectProfile = {
  id: number;
  hasApiKey: boolean;
  hasMcpToken: boolean;
};

export default function ConnectPage() {
  const [profile, setProfile] = useState<ConnectProfile | null>(null);
  const [mcpStatus, setMcpStatus] = useState<McpOnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const [apiKey, setApiKey] = useState('');
  const [keySaving, setKeySaving] = useState(false);
  const [keyMsg, setKeyMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [mcpToken, setMcpToken] = useState('');
  const [mcpGenerating, setMcpGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

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

  if (loading) {
    return (
      <div className="mx-auto max-w-prose py-20 text-center">
        <p className="font-serif italic text-sm text-sepia">正在检查登录状态…</p>
      </div>
    );
  }

  if (!profile) return <ConnectGuestState />;

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

  return (
    <div className="mx-auto max-w-prose px-4 sm:px-6 py-8">
      <div className="mb-6">
        <Link href={`/profile/${profile.id}`} className="inline-flex items-center gap-1.5 font-serif italic text-sm text-sepia hover:text-ink-brown transition-colors">
          ← 返回个人主页
        </Link>
      </div>

      <header className="mb-8 pb-5 border-b border-paper-edge">
        <p className="font-display tracking-display text-[11px] text-sepia uppercase mb-1">
          连接配置
        </p>
        <h1 className="font-serif text-3xl text-ink-brown">连接你的 AI 客户端</h1>
        <p className="font-serif italic text-sm text-leather mt-2">
          收藏 Skill，生成 Token，在 Claude Code / Cursor / Windsurf 等客户端里调用 N.E.I.
        </p>
      </header>

      {mcpStatus && (
        <div className="mb-8">
          <McpOnboardingChecklist status={mcpStatus} />
        </div>
      )}

      <section className="mb-10">
        <h2 className="font-serif text-xl text-ink-brown mb-1">MCP Server（推荐）</h2>
        <p className="font-sans text-xs text-sepia mb-4">
          生成 Token 后，在你信任的本地或已登录 AI 客户端里配置 N.E.I. MCP Server。
          N.E.I. 只分发 Skill，不读取本地文件，不上传项目材料。详情见{' '}
          <Link href="/security" className="text-wax-red underline">安全与保密原则</Link>。
        </p>
        <div className="mb-4 rounded-md border border-gilded/40 bg-gilded/5 px-4 py-3">
          <p className="font-serif text-sm text-ink-brown">
            N.E.I. MCP 只分发方法，不接管你的项目材料。
          </p>
          <p className="mt-1 font-sans text-xs leading-5 text-leather">
            它不会读取本地文件，不会上传 BP、财务模型或投委会材料，也不会保存你的项目敏感信息。
            如果 Token 泄露，可以随时重新生成。
          </p>
        </div>

        {mcpToken ? (
          <div className="space-y-3">
            <div className="p-3 rounded-md border border-gilded/40 bg-gilded/5">
              <p className="font-sans text-xs text-leather mb-1">你的 MCP Token（只显示一次，请保存）：</p>
              <code className="font-mono text-sm text-ink-brown break-all">{mcpToken}</code>
            </div>
            <p className="font-sans text-xs text-wax-red">
              不要把 Token 发给陌生网页、群聊、截图或不可信 Agent；泄露后请立即重新生成。
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => { navigator.clipboard.writeText(mcpToken); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                {copied ? '已复制' : '复制 Token'}
              </Button>
              <Link href="/mcp" className="inline-flex items-center h-9 px-4 border border-paper-edge text-leather hover:border-ink-brown hover:text-ink-brown font-serif text-sm rounded-sm transition-colors">
                配置指南 →
              </Link>
            </div>
          </div>
        ) : profile.hasMcpToken ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 h-9 px-4 border border-moss/40 bg-moss/5 text-moss font-sans text-sm rounded-sm">
                ✓ MCP Token 已配置
              </span>
              <Button type="button" variant="secondary" onClick={generateMcpToken} disabled={mcpGenerating}>
                {mcpGenerating ? '生成中…' : '重新生成'}
              </Button>
            </div>
            <Link href="/mcp" className="inline-flex items-center text-sm text-leather hover:text-ink-brown font-serif italic">
              查看配置指南 →
            </Link>
          </div>
        ) : (
          <Button type="button" onClick={generateMcpToken} disabled={mcpGenerating}>
            {mcpGenerating ? '生成中…' : '生成 MCP Token'}
          </Button>
        )}
      </section>

      <section className="mt-10 pt-8 border-t border-paper-edge">
        <h2 className="font-serif text-xl text-ink-brown mb-1">网站执行 API Key（选填）</h2>
        <p className="font-sans text-xs text-sepia mb-4">
          配置 Anthropic API key 后，可以在网站内直接执行 Prompt。Key 会加密存储，不会明文展示。
        </p>
        {profile.hasApiKey ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 h-9 px-4 border border-moss/40 bg-moss/5 text-moss font-sans text-sm rounded-sm">
              ✓ 已配置
            </span>
            <button
              type="button"
              onClick={async () => {
                setKeySaving(true);
                await fetch('/api/users/me', { method: 'DELETE' });
                setKeySaving(false);
                setProfile((p) => (p ? { ...p, hasApiKey: false } : p));
                setKeyMsg({ ok: true, text: '已清除' });
              }}
              disabled={keySaving}
              className="font-sans text-sm text-wax-red hover:underline"
            >
              {keySaving ? '清除中…' : '清除'}
            </button>
          </div>
        ) : (
          <form onSubmit={async (e) => {
            e.preventDefault();
            setKeyMsg(null);
            if (!apiKey.trim()) return;
            setKeySaving(true);
            const res = await fetch('/api/users/me', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apiKey: apiKey.trim() }),
            });
            const data = await res.json();
            setKeySaving(false);
            if (!res.ok) {
              setKeyMsg({ ok: false, text: data.error || '保存失败' });
              return;
            }
            setProfile((p) => (p ? { ...p, hasApiKey: true } : p));
            setApiKey('');
            setKeyMsg({ ok: true, text: 'API key 已加密保存' });
          }}>
            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-ant-..." />
            {keyMsg && <p className={cn('mt-2 font-sans text-sm border-l pl-3', keyMsg.ok ? 'text-moss border-moss' : 'text-wax-red border-wax-red')}>{keyMsg.text}</p>}
            <div className="mt-3">
              <Button type="submit" disabled={keySaving || !apiKey.trim()}>
                {keySaving ? '保存中…' : '保存 API Key'}
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

function ConnectGuestState() {
  return (
    <div className="mx-auto max-w-prose px-4 sm:px-6 py-12">
      <header className="mb-8 pb-5 border-b border-paper-edge">
        <p className="font-display tracking-display text-[11px] text-sepia uppercase mb-1">
          Connect N.E.I.
        </p>
        <h1 className="font-serif text-3xl text-ink-brown">登录后连接你的 AI 客户端</h1>
        <p className="font-serif italic text-sm text-leather mt-2">
          登录后可以生成 MCP Token、查看你的收藏，并把 Skill Library 接入 Claude Code / Cursor / Windsurf。
        </p>
      </header>

      <div className="rounded-md border border-gilded/40 bg-gilded/5 p-5">
        <h2 className="font-serif text-xl text-ink-brown mb-2">MCP 是什么？</h2>
        <p className="font-sans text-sm text-leather leading-7">
          MCP 让 AI 客户端读取你收藏的 N.E.I. Skill。N.E.I. 只分发 Skill / Workflow，
          不读取本地文件，不上传你的 BP、财务模型或投委会材料。
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/login?next=/connect" className="inline-flex items-center h-10 px-5 bg-ink-brown text-vellum hover:bg-wax-red font-serif text-sm rounded-sm transition-colors">
            登录后生成 MCP Token
          </Link>
          <Link href="/register" className="inline-flex items-center h-10 px-5 border border-ink-brown text-ink-brown hover:bg-ink-brown hover:text-vellum font-serif text-sm rounded-sm transition-colors">
            注册账号
          </Link>
          <Link href="/mcp" className="inline-flex items-center h-10 px-2 font-serif italic text-sm text-leather hover:text-wax-red transition-colors">
            查看配置指南 →
          </Link>
        </div>
      </div>
    </div>
  );
}
