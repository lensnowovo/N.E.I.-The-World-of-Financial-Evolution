'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';

type Mode = 'password' | 'code';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  // 安全校验：next 仅允许站内路径（单个 / 开头）。
  // 排除 `//evil.com`（协议相对，浏览器会当作 https://evil.com）与 `\/evil.com` /
  // `/\evil.com`（反斜杠在部分浏览器会被规范化为 //，等价于协议相对）。
  // 不合规一律回退到首页，防止 open redirect。
  const rawNext = params.get('next') || '/';
  const next =
    rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('\\')
      ? rawNext
      : '/';

  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);
  const [codeCooldown, setCodeCooldown] = useState(0);

  useEffect(() => {
    if (codeCooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setCodeCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [codeCooldown]);

  const sendCode = async () => {
    if (sending || codeCooldown > 0) return;

    setErr(null);
    setDevCode(null);

    if (!email.includes('@')) {
      setErr('请输入有效的邮箱地址');
      return;
    }

    try {
      setSending(true);
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const retryAfter = Number(data.retryAfter);
        if (res.status === 429 && Number.isFinite(retryAfter) && retryAfter > 0) {
          setCodeCooldown(Math.ceil(retryAfter));
        }
        setErr(data.error || '发送验证码失败，请稍后再试');
        return;
      }

      setDevCode(data.devCode ?? null);
      setCodeCooldown(60);
    } catch {
      setErr('发送验证码失败，请检查网络后重试');
    } finally {
      setSending(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, code, mode }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setErr(data.error || '登录失败');
      return;
    }
    router.push(next);
    router.refresh();
  };

  return (
    <AuthFrame
      eyebrow="登录"
      title="欢迎回来"
      subtitle="登录后即可发布、评论和收藏"
      footer={
        <>
          初次到访？
          <Link
            href="/register"
            className="ml-1 underline underline-offset-4 decoration-paper-edge hover:text-ink-brown hover:decoration-ink-brown"
          >
            创建身份
          </Link>
        </>
      }
    >
      {/* —— GitHub 登录 —— */}
      <a
        href="/api/auth/github"
        className="flex items-center justify-center gap-2 w-full rounded-sm border border-paper-edge bg-vellum px-4 py-3 font-sans text-sm text-ink-brown hover:bg-parchment transition-colors"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        通过 GitHub 登录
      </a>

      {/* —— 分隔线 —— */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-paper-edge" />
        <span className="font-serif italic text-xs text-sepia">或</span>
        <div className="flex-1 h-px bg-paper-edge" />
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* —— 模式切换 —— */}
        <div className="flex items-center justify-center gap-0 border-b border-paper-edge -mt-2 mb-2">
          <ModeTab active={mode === 'password'} onClick={() => setMode('password')}>
            密码
          </ModeTab>
          <span className="w-px h-4 bg-paper-edge" />
          <ModeTab active={mode === 'code'} onClick={() => setMode('code')}>
            邮箱验证码
          </ModeTab>
        </div>

        <Input
          label="邮箱"
          type="email"
          placeholder="your@email.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value.trim())}
        />

        {mode === 'password' ? (
          <Input
            label="密码"
            type="password"
            placeholder="8-20 位，含字母与数字"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        ) : (
          <div>
            <label className="mb-1.5 block font-serif text-sm text-ink-brown">
              邮箱验证码
            </label>
            <div className="flex gap-2">
              <input
                className="block w-full rounded-sm border border-paper-edge bg-vellum px-3 py-2 text-sm font-sans text-ink-brown placeholder:text-sepia/70 focus:border-ink-brown focus:outline-none"
                placeholder="6 位数字"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={sendCode}
                disabled={sending || codeCooldown > 0 || !email.includes('@')}
                className="whitespace-nowrap"
              >
                {sending ? '发送中…' : codeCooldown > 0 ? `${codeCooldown} 秒后重发` : '获取验证码'}
              </Button>
            </div>
            {devCode && (
              <p className="mt-1.5 text-xs font-sans text-gilded">
                开发模式 · 验证码：
                <span className="font-serif num-osf ml-1 text-sm">{devCode}</span>
              </p>
            )}
          </div>
        )}

        {err && (
          <p className="text-sm font-sans text-wax-red border-l border-wax-red pl-3">
            {err}
          </p>
        )}

        <Button type="submit" block size="lg" disabled={submitting}>
          {submitting ? '验证中…' : mode === 'password' ? '登录' : '验证并登录'}
        </Button>

        {mode === 'password' && (
          <p className="text-center text-xs font-sans text-sepia">
            忘记密码？请改用
            <button
              type="button"
              onClick={() => setMode('code')}
              className="ml-1 underline underline-offset-4 decoration-paper-edge hover:text-ink-brown hover:decoration-ink-brown"
            >
              验证码登录
            </button>
          </p>
        )}
      </form>
    </AuthFrame>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative px-5 py-2.5 font-serif text-sm transition-colors',
        active ? 'text-ink-brown' : 'text-sepia hover:text-leather',
      )}
    >
      {children}
      {active && (
        <span className="absolute -bottom-px left-3 right-3 h-px bg-ink-brown" />
      )}
    </button>
  );
}
