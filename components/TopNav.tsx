'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { roleColor } from '@/lib/tags';

type User = { id: number; nickname: string; role: string; avatarUrl: string | null } | null;

export function TopNav({ user }: { user: User }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState('');

  const onLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.refresh();
    router.push('/login');
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-ink-300/60 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-brand-600">
          <span className="grid h-8 w-8 place-content-center rounded-md bg-brand-600 text-white">P</span>
          <span>PEVC 知识平台</span>
        </Link>

        <form onSubmit={onSearch} className="ml-4 hidden flex-1 md:flex">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索内容、作者…"
            className="input max-w-md"
          />
        </form>

        <nav className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link href="/publish" className="btn-primary">
                ✏️ 发布
              </Link>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-full bg-ink-100 px-2 py-1 text-sm"
                >
                  <span className="grid h-7 w-7 place-content-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    {user.nickname.slice(0, 1).toUpperCase()}
                  </span>
                  <span>{user.nickname}</span>
                  <span className={`chip ${roleColor(user.role)}`}>{user.role}</span>
                </button>
                {menuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-44 overflow-hidden rounded-md border border-ink-300 bg-white shadow-card"
                    onMouseLeave={() => setMenuOpen(false)}
                  >
                    <Link href={`/profile/${user.id}`} className="block px-3 py-2 text-sm hover:bg-ink-100">
                      个人主页
                    </Link>
                    <Link href="/publish" className="block px-3 py-2 text-sm hover:bg-ink-100 md:hidden">
                      发布内容
                    </Link>
                    <button onClick={onLogout} className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-ink-100">
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                登录
              </Link>
              <Link href="/register" className="btn-primary">
                注册
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
