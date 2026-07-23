'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RoleBadge } from '@/components/icons/RoleBadge';
import { cn } from '@/lib/cn';
import { INVESTOR_ROLES, type InvestorRole } from '@/lib/roles';
import { PRIVACY_VERSION, TERMS_VERSION } from '@/lib/legal';

const STEPS = ['验证邮箱', '选择身份', '设定资料'];

export default function RegisterPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [stepIdx, setStepIdx] = useState(1); // 1 / 2 / 3
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [role, setRole] = useState<InvestorRole | ''>('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [crossBorderAccepted, setCrossBorderAccepted] = useState(false);

  const [err, setErr] = useState<string | null>(() =>
    params.get('error') === 'github_registration_requires_consent'
      ? '新账号请先完成邮箱验证和协议确认；注册后可使用同一 GitHub 邮箱登录。'
      : null,
  );
  const [devCode, setDevCode] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [codeCooldown, setCodeCooldown] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (codeCooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setCodeCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [codeCooldown]);

  /* —— 发送验证码 —— */
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

  /* —— 步骤 1 → 2 —— */
  const goStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!email.includes('@')) {
      setErr('请输入有效的邮箱地址');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setErr('请输入 6 位邮箱验证码');
      return;
    }
    setStepIdx(2);
  };

  /* —— 步骤 2 → 3 —— */
  const goStep3 = () => {
    setErr(null);
    if (!role) {
      setErr('请选择你的身份');
      return;
    }
    setStepIdx(3);
  };

  /* —— 步骤 3 提交 —— */
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!(nickname.length >= 2 && nickname.length <= 20)) {
      setErr('昵称需 2-20 字符');
      return;
    }
    if (!(password.length >= 8 && password.length <= 20 && /[A-Za-z]/.test(password) && /\d/.test(password))) {
      setErr('密码需 8-20 位，含字母与数字');
      return;
    }
    if (!termsAccepted || !privacyAccepted || !adultConfirmed || !crossBorderAccepted) {
      setErr('请完成协议、隐私政策和年龄确认');
      return;
    }
    setSubmitting(true);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        code,
        role,
        nickname,
        password,
        termsAccepted,
        privacyAccepted,
        adultConfirmed,
        crossBorderAccepted,
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setErr(data.error || '注册失败');
      return;
    }
    router.push('/');
    router.refresh();
  };

  return (
    <AuthFrame
      eyebrow="注册"
      title="加入社区"
      subtitle="发布、收藏、和同行交流"
      step={{ current: stepIdx, labels: STEPS }}
      size={stepIdx === 2 ? 'lg' : 'sm'}
      crest={stepIdx === 2}
      footer={
        <>
          已有账号？
          <Link
            href="/login"
            className="ml-1 underline underline-offset-4 decoration-paper-edge hover:text-ink-brown hover:decoration-ink-brown"
          >
            去登录
          </Link>
        </>
      }
    >
      {/* ============ 屏 1：手机 + 验证码 ============ */}
      {stepIdx === 1 && (
        <div className="space-y-6">
        <form onSubmit={goStep2} className="space-y-6">
          <Input
            label="邮箱"
            type="email"
            placeholder="your@email.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
          />

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

          {err && (
            <p className="text-sm font-sans text-wax-red border-l border-wax-red pl-3">
              {err}
            </p>
          )}

          <Button type="submit" block size="lg">
            下一步 · 选择身份
          </Button>
        </form>
        </div>
      )}

      {/* ============ 屏 2：身份徽章 ============ */}
      {stepIdx === 2 && (
        <div className="space-y-7">
          <p className="font-serif italic text-leather text-center">
            请选择最贴近你当前工作的身份。之后仍可在个人设置里调整。
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {INVESTOR_ROLES.map((info) => {
              const active = role === info.value;
              return (
                <button
                  key={info.value}
                  type="button"
                  onClick={() => setRole(info.value)}
                  className={cn(
                    'group text-center px-4 py-6 border transition-all duration-150',
                    'focus:outline-none',
                    active
                      ? 'border-ink-brown bg-parchment'
                      : 'border-paper-edge bg-vellum hover:border-sepia',
                  )}
                >
                  <div className="flex justify-center mb-4">
                    <RoleBadge role={info.value} size={56} />
                  </div>
                  <p
                    className={cn(
                      'font-display tracking-display text-base mb-1',
                      active ? 'text-ink-brown' : 'text-leather',
                    )}
                  >
                    {info.label}
                  </p>
                  <p className="font-serif italic text-sm text-leather mb-2">
                    {info.fullName}
                  </p>
                  <p className="font-sans text-xs text-sepia leading-relaxed">
                    {info.desc}
                  </p>
                  {active && (
                    <div className="mt-4 inline-flex items-center gap-1.5 font-sans text-[10px] tracking-wide text-gilded uppercase">
                      <span className="w-1 h-1 rounded-full bg-gilded" />
                      已选定
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {err && (
            <p className="text-sm font-sans text-wax-red border-l border-wax-red pl-3">
              {err}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setStepIdx(1)} className="flex-1">
              ← 返回
            </Button>
            <Button onClick={goStep3} disabled={!role} className="flex-1" size="lg">
              下一步 · 设定资料
            </Button>
          </div>
        </div>
      )}

      {/* ============ 屏 3：昵称 + 密码 ============ */}
      {stepIdx === 3 && (
        <form onSubmit={submit} className="space-y-6">
          <div className="flex items-center gap-3 -mt-1 mb-2 pb-4 border-b border-paper-edge">
            <RoleBadge role={role || 'VC'} size={32} />
            <div>
              <p className="font-display tracking-display text-xs text-sepia">
                你的身份
              </p>
              <p className="font-serif text-base text-ink-brown">
                {INVESTOR_ROLES.find((item) => item.value === role)?.fullName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStepIdx(2)}
              className="ml-auto font-sans text-xs text-sepia underline underline-offset-4 decoration-paper-edge hover:text-ink-brown hover:decoration-ink-brown"
            >
              修改
            </button>
          </div>

          <Input
            label="昵称"
            placeholder="2-20 字符 · 全平台唯一"
            hint="将展示在你的发布、评论、徽章旁，建议使用真名或机构缩写"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
          />

          <Input
            label="登录密码"
            type="password"
            placeholder="8-20 位，含字母与数字"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <fieldset className="space-y-3 border-t border-paper-edge pt-4">
            <legend className="sr-only">注册确认</legend>
            <ConsentCheckbox checked={termsAccepted} onChange={setTermsAccepted}>
              我已阅读并同意 <Link href="/terms" target="_blank" className="underline underline-offset-4">《用户协议》</Link>
            </ConsentCheckbox>
            <ConsentCheckbox checked={privacyAccepted} onChange={setPrivacyAccepted}>
              我已阅读并同意 <Link href="/privacy" target="_blank" className="underline underline-offset-4">《隐私政策》</Link>
            </ConsentCheckbox>
            <ConsentCheckbox checked={adultConfirmed} onChange={setAdultConfirmed}>
              我已年满 18 周岁
            </ConsentCheckbox>
            <ConsentCheckbox checked={crossBorderAccepted} onChange={setCrossBorderAccepted}>
              我单独同意为提供账号、邮件和网站服务，将必要数据提供给隐私政策列明的境外服务商
            </ConsentCheckbox>
            <p className="font-sans text-[11px] leading-5 text-sepia">
              协议不会默认勾选。注册时间、协议版本和必要的安全元数据会作为同意记录保存。
            </p>
          </fieldset>

          {err && (
            <p className="text-sm font-sans text-wax-red border-l border-wax-red pl-3">
              {err}
            </p>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" type="button" onClick={() => setStepIdx(2)} className="flex-1">
              ← 返回
            </Button>
            <Button type="submit" size="lg" className="flex-1" disabled={submitting || !termsAccepted || !privacyAccepted || !adultConfirmed || !crossBorderAccepted}>
              {submitting ? '提交中…' : '完成注册'}
            </Button>
          </div>
        </form>
      )}
    </AuthFrame>
  );
}

function ConsentCheckbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 font-sans text-xs leading-5 text-leather">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 accent-ink-brown"
      />
      <span>{children}</span>
    </label>
  );
}
