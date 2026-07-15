'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { INVESTOR_ROLES } from '@/lib/roles';

type Profile = {
  id: number;
  email: string;
  nickname: string;
  role: string;
  institution: string | null;
  bio: string | null;
  avatarUrl: string | null;
  hasMcpToken: boolean;
};

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState('VC');
  const [institution, setInstitution] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // 修改密码
  const [pwCode, setPwCode] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwCooldown, setPwCooldown] = useState(0);

  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) {
          return;
        }
        setProfile(d);
        setNickname(d.nickname || '');
        setRole(d.role || 'VC');
        setInstitution(d.institution || '');
        setBio(d.bio || '');
        setAvatarUrl(d.avatarUrl || '');
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (pwCooldown <= 0) return;
    const timer = window.setTimeout(() => {
      setPwCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [pwCooldown]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname: nickname.trim(),
        role,
        institution: institution.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMsg({ ok: false, text: data.error || '保存失败' });
      return;
    }
    setMsg({ ok: true, text: '已保存' });
    // 触发顶部导航刷新（nickname/role 等可能变了）
    router.refresh();
  };

  // 修改密码：先发验证码到当前邮箱，再用验证码+新密码重置
  const sendPwCode = async () => {
    if (pwCooldown > 0) return;
    setPwMsg(null);
    if (!profile?.email) return;
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profile.email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPwMsg({ ok: false, text: data.error || '发送验证码失败' });
        return;
      }
      setPwMsg({
        ok: true,
        text: data.devCode
          ? `验证码已发送（开发模式：${data.devCode}）`
          : '验证码已发送到你的邮箱',
      });
      setPwCooldown(60);
    } catch {
      setPwMsg({ ok: false, text: '发送失败，请检查网络后重试' });
    }
  };

  const submitPw = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (!profile?.email) return;
    if (!/^\d{6}$/.test(pwCode)) {
      setPwMsg({ ok: false, text: '验证码需 6 位数字' });
      return;
    }
    if (newPw.length < 8 || !/[A-Za-z]/.test(newPw) || !/\d/.test(newPw)) {
      setPwMsg({ ok: false, text: '密码需 8-20 位，含字母和数字' });
      return;
    }
    setPwSaving(true);
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: profile.email, code: pwCode, newPassword: newPw }),
    });
    const data = await res.json().catch(() => ({}));
    setPwSaving(false);
    if (!res.ok) {
      setPwMsg({ ok: false, text: data.error || '修改失败' });
      return;
    }
    setPwMsg({ ok: true, text: '密码已修改' });
    setPwCode('');
    setNewPw('');
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-prose py-20 text-center">
        <p className="font-serif italic text-sm text-sepia">加载中…</p>
      </div>
    );
  }

  if (!profile) {
    return <SettingsGuestState />;
  }

  return (
    <div className="mx-auto max-w-page px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 grid gap-6 border-b border-paper-edge pb-8 lg:grid-cols-[1fr_22rem] lg:items-end">
        <div>
          <Link href={`/profile/${profile.id}`} className="mb-6 inline-flex font-serif text-sm italic text-sepia transition-colors hover:text-ink-brown">
            ← 返回个人主页
          </Link>
          <p className="mb-2 font-display text-[10px] uppercase tracking-[0.22em] text-antique-gold">Account ledger</p>
          <h1 className="font-serif text-4xl text-ink-brown sm:text-5xl">管理你的公开身份</h1>
          <p className="mt-3 max-w-2xl font-sans text-sm leading-7 text-leather">
            这里保存你在 N.E.I. 展示的资料。密码与 Agent 连接分开管理，避免把不同性质的设置挤在同一张表单里。
          </p>
        </div>

        <div className="border-l border-antique-gold/45 pl-5">
          <p className="font-display text-[9px] uppercase tracking-[0.2em] text-sepia">Public identity</p>
          <p className="mt-3 font-serif text-2xl text-ink-brown">{nickname || profile.nickname}</p>
          <p className="mt-1 font-sans text-xs text-leather">{institution || '暂未填写机构'} · {role}</p>
          <Link href={`/profile/${profile.id}`} className="mt-4 inline-flex font-serif text-sm italic text-sepia hover:text-wax-red">
            预览个人主页 →
          </Link>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-4 font-display text-[9px] uppercase tracking-[0.2em] text-sepia">Setting index</p>
          <nav className="space-y-px border-y border-paper-edge font-serif text-sm">
            <a href="#public-profile" className="flex items-center justify-between border-b border-paper-edge/70 py-3 text-ink-brown hover:text-wax-red">
              <span>公开资料</span><span className="font-mono text-[10px] text-sepia">01</span>
            </a>
            <a href="#account-security" className="flex items-center justify-between border-b border-paper-edge/70 py-3 text-leather hover:text-ink-brown">
              <span>账号安全</span><span className="font-mono text-[10px] text-sepia">02</span>
            </a>
            <a href="#agent-access" className="flex items-center justify-between py-3 text-leather hover:text-ink-brown">
              <span>Agent 连接</span><span className="font-mono text-[10px] text-sepia">03</span>
            </a>
          </nav>
          <p className="mt-5 font-serif text-xs italic leading-6 text-sepia">
            邮箱仅用于登录与安全验证，不会展示在个人主页。
          </p>
        </aside>

        <div className="space-y-8">
          <section id="public-profile" className="scroll-mt-24 bg-vellum/55 p-5 ring-1 ring-paper-edge sm:p-8">
            <SectionHeading index="01" title="公开资料" note="展示在个人主页和内容署名中" />
            <form onSubmit={submit} className="mt-7 space-y-6">
              <Field label="昵称" hint="2-20 字符，全平台唯一" required>
                <Input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} required />
              </Field>

              <Field label="身份" hint="选择最接近你当前工作的身份">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {INVESTOR_ROLES.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      aria-pressed={role === item.value}
                      onClick={() => setRole(item.value)}
                      className={cn(
                        'inline-flex min-h-10 items-center justify-center border px-3 py-2 text-center font-serif text-sm transition-colors',
                        role === item.value
                          ? 'border-ink-brown bg-ink-brown text-vellum'
                          : 'border-paper-edge bg-paper/25 text-leather hover:border-ink-brown hover:text-ink-brown',
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </Field>

              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="机构" hint="选填 · 基金 / 机构">
                  <Input value={institution} onChange={(e) => setInstitution(e.target.value)} maxLength={50} placeholder="例如：XX 资本、独立 FA" />
                </Field>
                <Field label="头像链接" hint="选填 · GitHub 登录会自动带入">
                  <Input type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
                </Field>
              </div>

              <Field label="个人简介" hint="选填 · 最多 200 字">
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} rows={3} placeholder="一句话介绍自己，比如专注的赛道、做的事…" />
                <p className="mt-1 text-right font-sans text-[11px] text-sepia num-osf">{bio.length}/200</p>
              </Field>

              {msg && <StatusMessage ok={msg.ok}>{msg.text}</StatusMessage>}

              <div className="flex items-center justify-between border-t border-paper-edge pt-5">
                <p className="hidden font-serif text-xs italic text-sepia sm:block">保存后会同步更新站内署名</p>
                <Button type="submit" size="lg" disabled={saving} className="ml-auto">{saving ? '保存中…' : '保存公开资料'}</Button>
              </div>
            </form>
          </section>

          <section id="account-security" className="scroll-mt-24 border-t border-antique-gold/45 pt-8">
            <SectionHeading index="02" title="账号安全" note={`验证码发送至 ${profile.email}`} />
            <form onSubmit={submitPw} className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Input value={pwCode} onChange={(e) => setPwCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 位验证码" maxLength={6} />
              <Button type="button" variant="secondary" onClick={sendPwCode} disabled={pwCooldown > 0}>
                {pwCooldown > 0 ? `${pwCooldown} 秒后重发` : '发送验证码'}
              </Button>
              <div className="sm:col-span-2">
                <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="新密码（8-20 位，含字母和数字）" maxLength={20} />
              </div>
              {pwMsg && <div className="sm:col-span-2"><StatusMessage ok={pwMsg.ok}>{pwMsg.text}</StatusMessage></div>}
              <div className="sm:col-span-2"><Button type="submit" disabled={pwSaving}>{pwSaving ? '修改中…' : '修改密码'}</Button></div>
            </form>
          </section>

          <section id="agent-access" className="scroll-mt-24 border-t border-antique-gold/45 pt-8">
            <SectionHeading index="03" title="Agent 连接" note="每个客户端使用独立 Token，可分别撤销" />
            <div className="mt-6 flex flex-col gap-5 bg-ink-brown px-5 py-6 text-vellum sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div>
                <p className="font-serif text-xl">在连接台管理你的客户端</p>
                <p className="mt-2 max-w-xl font-sans text-xs leading-6 text-vellum/70">N.E.I. 只分发 Skill 内容。连接、撤销和状态检测都在独立页面完成。</p>
              </div>
              <Link href="/connect" className="inline-flex h-10 shrink-0 items-center justify-center border border-vellum/45 px-5 font-serif text-sm transition-colors hover:bg-vellum hover:text-ink-brown">
                打开连接台 →
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SettingsGuestState() {
  return (
    <div className="mx-auto max-w-prose px-4 sm:px-6 py-12">
      <header className="mb-8 pb-5 border-b border-paper-edge">
        <p className="font-display tracking-display text-[11px] text-sepia uppercase mb-1">
          个人设置
        </p>
        <h1 className="font-serif text-3xl text-ink-brown">登录后管理你的 N.E.I. 账号</h1>
        <p className="font-serif italic text-sm text-leather mt-2">
          登录后可以编辑资料、进入连接配置、生成 MCP Token，并查看你的收藏库。
        </p>
      </header>

      <div className="rounded-md border border-paper-edge bg-vellum/60 p-5">
        <h2 className="font-serif text-xl text-ink-brown mb-2">还没有登录</h2>
        <p className="font-sans text-sm text-leather leading-7">
          如果你是来配置 MCP，请先登录，再到连接配置页生成 Token。
          N.E.I. MCP 只分发 Skill / Workflow，不读取本地文件，不保存项目材料。
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/login?next=/settings" className="inline-flex items-center h-10 px-5 bg-ink-brown text-vellum hover:bg-wax-red font-serif text-sm rounded-sm transition-colors">
            登录后编辑资料
          </Link>
          <Link href="/login?next=/connect" className="inline-flex items-center h-10 px-5 border border-ink-brown text-ink-brown hover:bg-ink-brown hover:text-vellum font-serif text-sm rounded-sm transition-colors">
            登录后生成 MCP Token
          </Link>
          <Link href="/register" className="inline-flex items-center h-10 px-2 font-serif italic text-sm text-leather hover:text-wax-red transition-colors">
            注册账号 →
          </Link>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ index, title, note }: { index: string; title: string; note: string }) {
  return (
    <div className="flex flex-col gap-2 border-b border-paper-edge pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[10px] text-antique-gold">{index}</span>
        <h2 className="font-serif text-2xl text-ink-brown">{title}</h2>
      </div>
      <p className="font-serif text-xs italic text-sepia">{note}</p>
    </div>
  );
}

function StatusMessage({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <p className={cn('border-l pl-3 font-sans text-sm', ok ? 'border-moss text-moss' : 'border-wax-red text-wax-red')}>
      {children}
    </p>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="font-serif text-sm text-ink-brown">{label}</span>
        {required && <span className="font-sans text-[10px] text-wax-red tracking-wide uppercase">必填</span>}
        {hint && <span className="font-sans text-[10px] text-sepia tracking-wide">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
