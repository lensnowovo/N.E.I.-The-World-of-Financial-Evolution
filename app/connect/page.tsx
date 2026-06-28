'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { PUBLIC_BASE_URL } from '@/lib/public-url';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { McpQuickSetupPanel } from '@/components/mcp/McpQuickSetupPanel';
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
          收藏 Skill，生成 Token，一键复制配置包，在 Claude Code / Cursor / Windsurf 等客户端里调用 N.E.I.
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

          <ApiKeySection
            hasApiKey={profile.hasApiKey}
            apiKey={apiKey}
            keySaving={keySaving}
            keyMsg={keyMsg}
            onApiKeyChange={setApiKey}
            onClear={async () => {
              setKeySaving(true);
              await fetch('/api/users/me', { method: 'DELETE' });
              setKeySaving(false);
              setProfile((p) => (p ? { ...p, hasApiKey: false } : p));
              setKeyMsg({ ok: true, text: '已清除' });
            }}
            onSave={async () => {
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
              setKeyMsg({ ok: true, text: 'API Key 已加密保存' });
            }}
          />
        </main>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          {mcpStatus && <McpOnboardingChecklist status={mcpStatus} compact />}

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
              <li>1. 收藏几个常用 Skill。</li>
              <li>2. 在客户端调用 <code className="font-mono">list_my_skills</code>。</li>
              <li>3. 让 AI 根据当前任务选择 Skill。</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ApiKeySection({
  hasApiKey,
  apiKey,
  keySaving,
  keyMsg,
  onApiKeyChange,
  onSave,
  onClear,
}: {
  hasApiKey: boolean;
  apiKey: string;
  keySaving: boolean;
  keyMsg: { ok: boolean; text: string } | null;
  onApiKeyChange: (value: string) => void;
  onSave: () => Promise<void>;
  onClear: () => Promise<void>;
}) {
  return (
    <section className="border-t border-paper-edge pt-8">
      <h2 className="font-serif text-xl text-ink-brown mb-1">网站执行 API Key（选填）</h2>
      <p className="font-sans text-xs text-sepia mb-4 leading-6">
        MCP 连接不需要填写这里。只有当你想在网站内直接执行 Prompt 时，才需要配置 Anthropic API Key。
        Key 会加密存储，不会明文展示。
      </p>

      {hasApiKey ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-moss/40 bg-moss/5 px-4 font-sans text-sm text-moss">
            ✓ 已配置
          </span>
          <button
            type="button"
            onClick={onClear}
            disabled={keySaving}
            className="font-sans text-sm text-wax-red hover:underline disabled:opacity-60"
          >
            {keySaving ? '清除中…' : '清除'}
          </button>
          {keyMsg && <StatusMessage message={keyMsg} />}
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await onSave();
          }}
        >
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="sk-ant-..."
          />
          {keyMsg && <StatusMessage message={keyMsg} />}
          <div className="mt-3">
            <Button type="submit" disabled={keySaving || !apiKey.trim()}>
              {keySaving ? '保存中…' : '保存 API Key'}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

function StatusMessage({ message }: { message: { ok: boolean; text: string } }) {
  return (
    <p className={cn('mt-2 border-l pl-3 font-sans text-sm', message.ok ? 'border-moss text-moss' : 'border-wax-red text-wax-red')}>
      {message.text}
    </p>
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
          <Link href="/login?next=/connect" className="inline-flex h-10 items-center rounded-sm bg-ink-brown px-5 font-serif text-sm text-vellum transition-colors hover:bg-wax-red">
            登录后生成配置包
          </Link>
          <Link href="/register" className="inline-flex h-10 items-center rounded-sm border border-ink-brown px-5 font-serif text-sm text-ink-brown transition-colors hover:bg-ink-brown hover:text-vellum">
            注册账号
          </Link>
          <Link href="/mcp" className="inline-flex h-10 items-center px-2 font-serif text-sm italic text-leather transition-colors hover:text-wax-red">
            查看配置说明 →
          </Link>
        </div>
      </div>
    </div>
  );
}
