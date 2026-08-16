'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type McpTokenView = {
  id: string;
  name: string;
  clientType: string;
  hint: string;
  createdAt: string | null;
  lastUsedAt: string | null;
  connected: boolean;
  tools: string[];
  legacy: boolean;
};

export type NewMcpCredential = {
  token: string;
  item: McpTokenView;
};

type Props = {
  tokens: McpTokenView[];
  maxActive: number;
  newCredential: NewMcpCredential | null;
  creating: boolean;
  error: string | null;
  mcpUrl: string;
  onCreate: (name: string, clientType: string) => Promise<void>;
  onRevoke: (id: string) => Promise<void>;
};

export function McpConnectionConsole({
  tokens,
  maxActive,
  newCredential,
  creating,
  error,
  mcpUrl,
  onCreate,
  onRevoke,
}: Props) {
  const [tokenName, setTokenName] = useState('');
  const connectedCount = tokens.filter((token) => token.connected).length;

  return (
    <div className="space-y-6">
      <section
        id="new-connection"
        className="scroll-mt-24 border-y border-paper-edge bg-vellum/42 px-4 py-6 sm:px-6 sm:py-7"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-[10px] uppercase tracking-[0.2em] text-gilded">New connection</p>
            <h2 className="mt-2 font-serif text-3xl text-ink-brown">添加连接</h2>
            <p className="mt-2 max-w-2xl font-sans text-xs leading-6 text-leather">
              为每个 Agent 创建独立 Token，分别查看连接状态并随时管理。
            </p>
          </div>
          <p className="font-mono text-[11px] tracking-[0.08em] text-sepia">
            {connectedCount} CONNECTED · {tokens.length}/{maxActive} ACTIVE
          </p>
        </div>

        <div className="mcp-panel-enter mt-6">
            {newCredential ? (
              <CredentialReady credential={newCredential} mcpUrl={mcpUrl} clientLabel={newCredential.item.name} />
            ) : (
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <label className="block">
                  <span className="font-display text-[9px] uppercase tracking-[0.18em] text-sepia">连接名称</span>
                  <input
                    value={tokenName}
                    onChange={(event) => setTokenName(event.target.value)}
                    maxLength={48}
                    className="mt-2 h-12 w-full border border-sepia/45 bg-parchment/55 px-4 font-sans text-sm text-ink-brown outline-none transition-colors placeholder:text-sepia/60 focus:border-moss"
                    placeholder="例如：办公室 Codex、我的 Workbuddy"
                  />
                </label>
                <button
                  type="button"
                  disabled={creating || tokens.length >= maxActive || !tokenName.trim()}
                  onClick={() => onCreate(tokenName, 'other')}
                  className="inline-flex min-h-12 items-center justify-center bg-ink-brown px-7 font-serif text-sm text-vellum transition-colors hover:bg-moss disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {creating ? '正在生成…' : '生成 Token'}
                </button>
              </div>
            )}

            {error && (
              <p role="alert" className="mt-4 border-l-2 border-wax-red bg-wax-red/5 px-3 py-2 font-sans text-xs leading-5 text-wax-red">
                {error}
              </p>
            )}

            {!newCredential && (
              <div className="mt-6 grid border-t border-paper-edge sm:grid-cols-3 sm:divide-x sm:divide-paper-edge">
                <ConsoleStep number="01" title="填写连接名称" text="用于区分不同设备或 Agent" />
                <ConsoleStep number="02" title="复制接入指令" text="Token 只在本次生成后显示" />
                <ConsoleStep number="03" title="发起测试调用" text="真实调用后状态才会点亮" />
              </div>
            )}
        </div>
      </section>

      <TokenRegistry tokens={tokens} maxActive={maxActive} onRevoke={onRevoke} />
    </div>
  );
}

function CredentialReady({
  credential,
  mcpUrl,
  clientLabel,
}: {
  credential: NewMcpCredential;
  mcpUrl: string;
  clientLabel: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  const config = useMemo(() => buildSetupPrompt(clientLabel, mcpUrl, credential.token), [clientLabel, mcpUrl, credential.token]);
  const json = useMemo(() => JSON.stringify({
    mcpServers: {
      'nei-pevc': {
        url: mcpUrl,
        headers: { Authorization: `Bearer ${credential.token}` },
      },
    },
  }, null, 2), [credential.token, mcpUrl]);
  const test = '请调用 N.E.I. MCP 的 search_skills，搜索“BP 初筛”，再调用 get_skill 读取其中一个结果；如果失败，请告诉我失败在哪一步。';

  const copy = async (key: string, value: string) => {
    const ok = await copyText(value);
    setCopyError(!ok);
    if (!ok) return;
    setCopied(key);
    window.setTimeout(() => setCopied(null), 2200);
  };

  return (
    <div className="border border-gilded/45 bg-gilded/[0.06] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display text-[9px] uppercase tracking-[0.18em] text-gilded">Credential issued · only shown now</p>
          <p className="mt-2 font-mono text-sm text-ink-brown">nei_••••••••••••{credential.item.hint}</p>
          <p className="mt-2 max-w-xl font-sans text-xs leading-5 text-sepia">
            明文只保留在当前页面内存中。建议直接复制完整接入指令，不要截图保存。
          </p>
        </div>
        <CopyButton active={copied === 'token'} onClick={() => copy('token', credential.token)}>
          {copied === 'token' ? '已复制 Token' : '复制 Token'}
        </CopyButton>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <CopyButton primary active={copied === 'prompt'} onClick={() => copy('prompt', config)}>
          {copied === 'prompt' ? '接入指令已复制' : '复制接入指令'}
        </CopyButton>
        <CopyButton active={copied === 'json'} onClick={() => copy('json', json)}>
          {copied === 'json' ? 'JSON 已复制' : '复制 JSON'}
        </CopyButton>
        <CopyButton active={copied === 'test'} onClick={() => copy('test', test)}>
          {copied === 'test' ? '测试任务已复制' : '复制测试任务'}
        </CopyButton>
      </div>
      <p aria-live="polite" className={cn('mt-3 font-sans text-xs', copyError ? 'text-wax-red' : 'text-sepia')}>
        {copyError ? '复制失败，请检查浏览器剪贴板权限后重试。' : copied ? '已写入剪贴板。' : '配置完成并产生真实工具调用后，连接状态才会显示为在线。'}
      </p>
    </div>
  );
}

function TokenRegistry({ tokens, maxActive, onRevoke }: { tokens: McpTokenView[]; maxActive: number; onRevoke: (id: string) => Promise<void> }) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const revoke = async (id: string) => {
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }
    setBusyId(id);
    await onRevoke(id);
    setBusyId(null);
    setConfirmId(null);
  };

  return (
    <section className="border-y border-paper-edge py-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-[10px] uppercase tracking-display text-sepia">Access registry</p>
          <h2 className="mt-1 font-serif text-2xl text-ink-brown">客户端 Token</h2>
          <p className="mt-1 font-sans text-xs leading-5 text-leather">每个 Token 独立撤销。创建新 Token 不影响已有连接。</p>
        </div>
        <p className="font-mono text-xs text-sepia">{tokens.length} / {maxActive} ACTIVE</p>
      </div>

      {tokens.length === 0 ? (
        <div className="mt-4 border border-dashed border-paper-edge bg-vellum/40 px-4 py-8 text-center font-serif italic text-sm text-sepia">
          还没有客户端 Token。先在上方填写连接名称。
        </div>
      ) : (
        <div className="mt-4 divide-y divide-paper-edge border-y border-paper-edge">
          {tokens.map((token) => (
            <article key={token.id} className="group grid gap-4 py-4 transition-colors sm:grid-cols-[minmax(0,1.35fr)_minmax(0,0.8fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <ConnectionBadge connected={token.connected} />
                    {token.legacy && <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-sepia">Legacy</span>}
                  </div>
                  <h3 className="mt-2 truncate font-serif text-lg text-ink-brown">{token.name}</h3>
                  <p className="mt-1 font-mono text-[11px] text-sepia">nei_••••••{token.hint}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs sm:border-l sm:border-paper-edge sm:pl-5">
                  <TokenMeta label="最近使用" value={token.lastUsedAt ? formatDate(token.lastUsedAt) : '尚未调用'} />
                  <TokenMeta label="创建时间" value={token.createdAt ? formatDate(token.createdAt) : '旧版凭证'} />
                </div>
                <button
                  type="button"
                  disabled={busyId === token.id}
                  onClick={() => revoke(token.id)}
                  className={cn(
                    'w-fit shrink-0 border px-3 py-1.5 font-serif text-xs transition-colors',
                    confirmId === token.id
                      ? 'border-wax-red bg-wax-red text-vellum'
                      : 'border-paper-edge text-sepia hover:border-wax-red hover:text-wax-red',
                  )}
                >
                  {busyId === token.id ? '撤销中…' : confirmId === token.id ? '再次点击确认' : '撤销'}
                </button>
              {token.tools.length > 0 && (
                <div className="flex flex-wrap gap-1.5 sm:col-span-3">
                  {token.tools.slice(0, 4).map((tool) => (
                    <span key={tool} className="border border-moss/25 bg-moss/5 px-2 py-0.5 font-mono text-[10px] text-moss">{tool}</span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 border px-2 py-0.5 font-sans text-[10px]', connected ? 'border-moss/35 bg-moss/8 text-moss' : 'border-gilded/30 bg-gilded/5 text-sepia')}>
      <span className={cn('h-1.5 w-1.5 rounded-full', connected ? 'bg-moss' : 'bg-gilded/60')} />
      {connected ? '已验证连接' : '等待首次调用'}
    </span>
  );
}

function ConsoleStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="min-h-24 py-4 sm:px-4 first:pl-0">
      <p className="font-mono text-[9px] text-gilded">{number}</p>
      <p className="mt-2 font-serif text-sm text-ink-brown">{title}</p>
      <p className="mt-1 font-sans text-[11px] leading-5 text-sepia">{text}</p>
    </div>
  );
}

function CopyButton({ children, active, primary = false, onClick }: { children: ReactNode; active: boolean; primary?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex min-h-9 items-center justify-center border px-3 font-serif text-xs transition-colors',
        active
          ? 'border-[#9db082] bg-[#9db082] text-ink-brown'
          : primary
            ? 'border-ink-brown bg-ink-brown text-vellum hover:bg-moss'
            : 'border-sepia/35 text-leather hover:border-moss hover:text-moss',
      )}
    >
      {children}
    </button>
  );
}

function TokenMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-[9px] uppercase tracking-display text-sepia">{label}</p>
      <p className="mt-1 font-sans text-xs text-leather">{value}</p>
    </div>
  );
}

function buildSetupPrompt(clientLabel: string, mcpUrl: string, token: string) {
  return `请在当前受信任的 ${clientLabel} 客户端中接入 N.E.I. MCP Server。\n\n名称：nei-pevc\n传输协议：Streamable HTTP\nURL：${mcpUrl}\n请求头：Authorization: Bearer ${token}\n\n配置完成后，请调用 search_skills 搜索“BP 初筛”，再调用 get_skill 读取一个结果。N.E.I. MCP 只分发 Skill / Workflow，不读取本地文件，也不上传项目材料。`;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      return copied;
    } catch {
      return false;
    }
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
