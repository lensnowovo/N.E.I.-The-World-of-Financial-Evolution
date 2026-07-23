'use client';

import { useEffect, useMemo, useState } from 'react';

type ActivationCodeResponse =
  | { code: string; expires_in: number }
  | { error: string; retry_after?: number };

const ERROR_COPY: Record<string, string> = {
  UNAUTHORIZED: '登录状态已失效，请重新登录。',
  NO_ENTITLEMENT: '当前账号还没有 Memory Node 内测资格。',
  ENTITLEMENT_EXPIRED: '当前账号的 Memory Node 权益已过期。',
  RATE_LIMITED: '生成次数过多，请稍后再试。',
  CODE_GEN_FAILED: '激活码生成失败，请稍后再试。',
};

export function activationErrorMessage(error: string, retryAfter?: number) {
  const base = ERROR_COPY[error] ?? '暂时无法生成激活码，请稍后再试。';
  return error === 'RATE_LIMITED' && retryAfter
    ? `${base} ${retryAfter} 秒后可以重试。`
    : base;
}

function formatRemaining(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function ActivationCodePanel() {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const remaining = useMemo(
    () => Math.max(0, expiresAt ? Math.ceil((expiresAt - now) / 1000) : 0),
    [expiresAt, now],
  );
  const active = Boolean(code && remaining > 0);

  async function generateCode() {
    setBusy(true);
    setError(null);
    setCopied(false);

    try {
      const response = await fetch('/api/activation/code', {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
      const payload = (await response.json()) as ActivationCodeResponse;

      if (!response.ok || !('code' in payload)) {
        const failure = 'error' in payload ? payload : { error: 'UNKNOWN' };
        setError(activationErrorMessage(failure.error, failure.retry_after));
        return;
      }

      const ttl = Math.max(1, Math.min(payload.expires_in, 300));
      setCode(payload.code);
      setNow(Date.now());
      setExpiresAt(Date.now() + ttl * 1000);
    } catch {
      setError('网络连接失败，请检查网络后重试。');
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setError('复制失败，请手动选中激活码。');
    }
  }

  return (
    <section className="rounded-lg border border-[#b9cbc5] bg-[#edf3f0] p-6 shadow-[0_18px_48px_-38px_rgba(16,69,67,0.75)] sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-display text-[10px] uppercase tracking-display text-sepia">Browser Activation</p>
          <h1 className="mt-2 font-serif text-3xl text-ink-brown">连接这台 Memory Node</h1>
        </div>
        <span className="rounded-full border border-moss/30 bg-moss/5 px-3 py-1 font-mono text-[10px] text-moss">
          仅用于本机授权
        </span>
      </div>

      <p className="mt-4 max-w-2xl font-sans text-sm leading-7 text-leather">
        在 Memory Node 中点击“登录 N.E.I.”，再把这里生成的一次性激活码粘贴回客户端。
      </p>

      <div className="mt-8 min-h-44 rounded-md border border-paper-edge bg-vellum p-5 sm:p-7">
        {active ? (
          <div className="flex min-h-32 flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="font-sans text-xs text-sepia">一次性激活码</p>
              <button
                type="button"
                onClick={copyCode}
                className="mt-3 block font-mono text-4xl font-semibold tracking-[0.22em] text-ink-brown transition-colors hover:text-wax-red sm:text-5xl"
                aria-label="复制激活码"
              >
                {code}
              </button>
              <p className="mt-3 font-sans text-xs text-sepia">
                {copied ? '已复制' : '点击激活码即可复制'} · {formatRemaining(remaining)} 后失效
              </p>
            </div>
            <button
              type="button"
              onClick={generateCode}
              disabled={busy}
              className="inline-flex h-10 items-center justify-center rounded-sm border border-ink-brown px-4 font-serif text-sm text-ink-brown transition-colors hover:bg-ink-brown hover:text-vellum disabled:cursor-not-allowed disabled:opacity-50"
            >
              重新生成
            </button>
          </div>
        ) : (
          <div className="flex min-h-32 flex-col items-start justify-center">
            <p className="font-serif text-lg text-ink-brown">
              {code ? '激活码已失效' : '准备好客户端后，再生成激活码。'}
            </p>
            <p className="mt-2 font-sans text-xs leading-6 text-sepia">
              激活码 5 分钟内有效，只能使用一次。不要发送给他人。
            </p>
            <button
              type="button"
              onClick={generateCode}
              disabled={busy}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-sm bg-ink-brown px-5 font-serif text-sm text-vellum transition-colors hover:bg-wax-red disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? '正在生成…' : code ? '生成新激活码' : '生成激活码'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 border-l-2 border-wax-red pl-3 font-sans text-sm leading-6 text-wax-red">
          {error}
        </p>
      )}

      <div className="mt-7 grid gap-3 border-t border-paper-edge pt-6 font-sans text-xs leading-6 text-sepia sm:grid-cols-3">
        <p><span className="block font-serif text-sm text-ink-brown">网站负责登录</span>客户端不接触密码和 Cookie。</p>
        <p><span className="block font-serif text-sm text-ink-brown">许可证保存在本机</span>记忆数据不会随授权上传。</p>
        <p><span className="block font-serif text-sm text-ink-brown">设备独立授权</span>每个激活码只连接一台设备。</p>
      </div>
    </section>
  );
}
