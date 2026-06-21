'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type ConnectProfile = {
  id: number;
  hasApiKey: boolean;
  hasMcpToken: boolean;
};

export default function ConnectPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ConnectProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [apiKey, setApiKey] = useState('');
  const [keySaving, setKeySaving] = useState(false);
  const [keyMsg, setKeyMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [mcpToken, setMcpToken] = useState('');
  const [mcpGenerating, setMcpGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) { router.push('/login?next=/connect'); return; }
        setProfile(d);
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-prose py-20 text-center">
        <p className="font-serif italic text-sm text-sepia">加载中…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-prose px-4 sm:px-6 py-8">
      <div className="mb-6">
        <Link href={`/profile/${profile?.id}`} className="inline-flex items-center gap-1.5 font-serif italic text-sm text-sepia hover:text-ink-brown transition-colors">
          ← 返回个人主页
        </Link>
      </div>

      <header className="mb-8 pb-5 border-b border-paper-edge">
        <p className="font-display tracking-display text-[11px] text-sepia uppercase mb-1">
          连接配置
        </p>
        <h1 className="font-serif text-3xl text-ink-brown">连接你的 AI 客户端</h1>
        <p className="font-serif italic text-sm text-leather mt-2">
          配置后，可以在 AI 客户端或网站上直接使用 N.E.I. 的 Skill
        </p>
      </header>

      {/* —— MCP Token —— */}
      <section className="mb-10">
        <h2 className="font-serif text-xl text-ink-brown mb-1">MCP Server（推荐）</h2>
        <p className="font-sans text-xs text-sepia mb-4">
          生成 Token 后，在你的 AI 客户端（Claude Code / Cursor / Kimi）里配置 N.E.I. MCP Server，
          就能在客户端里直接搜索和调用本站的 Skill。用客户端自己的额度，零成本。详见
          <Link href="/mcp" className="text-wax-red underline ml-0.5">配置指南</Link>。
        </p>

        {mcpToken ? (
          <div className="space-y-3">
            <div className="p-3 rounded-md border border-gilded/40 bg-gilded/5">
              <p className="font-sans text-xs text-leather mb-1">你的 MCP Token（只显示一次，请保存）：</p>
              <code className="font-mono text-sm text-ink-brown break-all">{mcpToken}</code>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => { navigator.clipboard.writeText(mcpToken); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                {copied ? '已复制' : '复制 Token'}
              </Button>
              <Link href="/mcp" className="inline-flex items-center h-9 px-4 border border-paper-edge text-leather hover:border-ink-brown hover:text-ink-brown font-serif text-sm rounded-sm transition-colors">
                配置指南 →
              </Link>
            </div>
          </div>
        ) : profile?.hasMcpToken ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 h-9 px-4 border border-moss/40 bg-moss/5 text-moss font-sans text-sm rounded-sm">
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6.5L5 9.5L10 3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                MCP Token 已配置
              </span>
              <button
                type="button"
                onClick={async () => { setMcpGenerating(true); const res = await fetch('/api/users/me/mcp-token', { method: 'POST' }); const data = await res.json(); setMcpGenerating(false); if (res.ok) setMcpToken(data.token); }}
                disabled={mcpGenerating}
                className="font-sans text-sm text-wax-red hover:underline"
              >
                {mcpGenerating ? '生成中…' : '重新生成'}
              </button>
            </div>
            <Link href="/mcp" className="inline-flex items-center text-sm text-leather hover:text-ink-brown font-serif italic">
              查看配置指南 →
            </Link>
          </div>
        ) : (
          <Button type="button" onClick={async () => { setMcpGenerating(true); const res = await fetch('/api/users/me/mcp-token', { method: 'POST' }); const data = await res.json(); setMcpGenerating(false); if (res.ok) { setMcpToken(data.token); setProfile(p => p ? { ...p, hasMcpToken: true } : p); } }} disabled={mcpGenerating}>
            {mcpGenerating ? '生成中…' : '生成 MCP Token'}
          </Button>
        )}
      </section>

      {/* —— AI API Key —— */}
      <section className="mt-10 pt-8 border-t border-paper-edge">
        <h2 className="font-serif text-xl text-ink-brown mb-1">网站执行 API Key（选填）</h2>
        <p className="font-sans text-xs text-sepia mb-4">
          配置你的 Anthropic API key 后，可以在网站上直接执行 Skill（流式输出）。Key 加密存储，不会泄露。去{' '}
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-wax-red underline">console.anthropic.com</a>
          {' '}获取。
        </p>
        {profile?.hasApiKey ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 h-9 px-4 border border-moss/40 bg-moss/5 text-moss font-sans text-sm rounded-sm">
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6.5L5 9.5L10 3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              已配置
            </span>
            <button
              type="button"
              onClick={async () => { setKeySaving(true); await fetch('/api/users/me', { method: 'DELETE' }); setKeySaving(false); setProfile(p => p ? { ...p, hasApiKey: false } : p); setKeyMsg({ ok: true, text: '已清除' }); }}
              disabled={keySaving}
              className="font-sans text-sm text-wax-red hover:underline"
            >
              {keySaving ? '清除中…' : '清除'}
            </button>
          </div>
        ) : (
          <form onSubmit={async (e) => {
            e.preventDefault(); setKeyMsg(null);
            if (!apiKey.trim()) return;
            setKeySaving(true);
            const res = await fetch('/api/users/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: apiKey.trim() }) });
            const data = await res.json(); setKeySaving(false);
            if (!res.ok) { setKeyMsg({ ok: false, text: data.error || '保存失败' }); return; }
            setProfile(p => p ? { ...p, hasApiKey: true } : p); setApiKey(''); setKeyMsg({ ok: true, text: 'API key 已加密保存' });
          }}>
            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-ant-..." />
            {keyMsg && <p className={cn('mt-2 font-sans text-sm border-l pl-3', keyMsg.ok ? 'text-moss border-moss' : 'text-wax-red border-wax-red')}>{keyMsg.text}</p>}
            <div className="mt-3"><Button type="submit" disabled={keySaving || !apiKey.trim()}>{keySaving ? '保存中…' : '保存 API Key'}</Button></div>
          </form>
        )}
      </section>
    </div>
  );
}
