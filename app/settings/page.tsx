'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type Profile = {
  id: number;
  email: string;
  nickname: string;
  role: string;
  institution: string | null;
  bio: string | null;
  avatarUrl: string | null;
  hasApiKey: boolean;
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

  // API key
  const [apiKey, setApiKey] = useState('');
  const [keySaving, setKeySaving] = useState(false);
  const [keyMsg, setKeyMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // MCP Token
  const [mcpToken, setMcpToken] = useState('');
  const [mcpGenerating, setMcpGenerating] = useState(false);
  const [mcpMsg, setMcpMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

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
    const data = await res.json();
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
    setPwMsg(null);
    if (!profile?.email) return;
    const res = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: profile.email }),
    });
    const data = await res.json();
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
    const data = await res.json();
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
    <div className="mx-auto max-w-prose px-4 sm:px-6 py-8">
      <div className="mb-6">
        <Link href={`/profile/${profile?.id}`} className="inline-flex items-center gap-1.5 font-serif italic text-sm text-sepia hover:text-ink-brown transition-colors">
          ← 返回个人主页
        </Link>
      </div>

      <header className="mb-8 pb-5 border-b border-paper-edge">
        <p className="font-display tracking-display text-[11px] text-sepia uppercase mb-1">
          个人设置
        </p>
        <h1 className="font-serif text-3xl text-ink-brown">编辑资料</h1>
      </header>

      <form onSubmit={submit} className="space-y-6">
        {/* 昵称 */}
        <Field label="昵称" hint="2-20 字符，全平台唯一" required>
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            required
          />
        </Field>

        {/* 身份 */}
        <Field label="身份" hint="VC / PE / FA">
          <div className="flex gap-2">
            {(['VC', 'PE', 'FA'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={cn(
                  'inline-flex items-center h-10 px-5 font-serif text-sm rounded-sm border transition-colors',
                  role === r
                    ? 'border-ink-brown bg-ink-brown text-vellum'
                    : 'border-paper-edge text-leather hover:border-ink-brown',
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </Field>

        {/* 机构（选填） */}
        <Field label="机构" hint="选填 · 你所在的基金 / 机构">
          <Input
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            maxLength={50}
            placeholder="例如：XX 资本、独立 FA"
          />
        </Field>

        {/* 个人简介（选填） */}
        <Field label="个人简介" hint="选填 · 最多 200 字">
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="一句话介绍自己，比如专注的赛道、做的事…"
          />
          <p className="mt-1 text-right font-sans text-[11px] text-sepia num-osf">
            {bio.length}/200
          </p>
        </Field>

        {/* 头像 URL（选填） */}
        <Field label="头像链接" hint="选填 · 图片 URL（GitHub 登录会自动带）">
          <Input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
          />
        </Field>

        {msg && (
          <p
            className={cn(
              'font-sans text-sm border-l pl-3',
              msg.ok ? 'text-moss border-moss' : 'text-wax-red border-wax-red',
            )}
          >
            {msg.text}
          </p>
        )}

        <div className="pt-4 border-t border-paper-edge flex items-center justify-between">
          <p className="font-serif italic text-xs text-sepia hidden sm:block">
            昵称、身份、机构等会显示在你的个人主页
          </p>
          <Button type="submit" size="lg" disabled={saving} className="ml-auto">
            {saving ? '保存中…' : '保存'}
          </Button>
        </div>
      </form>

      {/* —— 修改密码 —— */}
      <section className="mt-10 pt-8 border-t border-paper-edge">
        <h2 className="font-serif text-xl text-ink-brown mb-1">修改密码</h2>
        <p className="font-sans text-xs text-sepia mb-4">
          通过邮箱验证码重置密码。验证码会发到 <span className="text-ink-brown">{profile?.email}</span>
        </p>
        <form onSubmit={submitPw} className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={pwCode}
              onChange={(e) => setPwCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6 位验证码"
              maxLength={6}
              className="flex-1"
            />
            <Button type="button" variant="secondary" onClick={sendPwCode}>
              发送验证码
            </Button>
          </div>
          <Input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="新密码（8-20 位，含字母和数字）"
            maxLength={20}
          />
          {pwMsg && (
            <p
              className={cn(
                'font-sans text-sm border-l pl-3',
                pwMsg.ok ? 'text-moss border-moss' : 'text-wax-red border-wax-red',
              )}
            >
              {pwMsg.text}
            </p>
          )}
          <Button type="submit" disabled={pwSaving}>
            {pwSaving ? '修改中…' : '修改密码'}
          </Button>
        </form>
      </section>

      {/* —— 连接配置入口 —— */}
      <section className="mt-10 pt-8 border-t border-paper-edge">
        <h2 className="font-serif text-xl text-ink-brown mb-1">连接配置</h2>
        <p className="font-sans text-xs text-sepia mb-3">
          MCP Token 和 API Key 已移到独立页面
        </p>
        <Link
          href="/connect"
          className="inline-flex items-center h-9 px-4 border border-paper-edge text-leather hover:border-ink-brown hover:text-ink-brown font-serif text-sm rounded-sm transition-colors"
        >
          连接配置 →
        </Link>
      </section>
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
