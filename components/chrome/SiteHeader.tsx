'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/cn';
import { RoleBadge } from '@/components/icons/RoleBadge';

type User = {
  id: number;
  nickname: string;
  role: string;
  avatarUrl: string | null;
} | null;

/**
 * 顶部导航
 *   桌面：Logo · 导航 · 搜索框 · 用户区
 *   移动：Logo · 汉堡按钮（展开抽屉：搜索 + 导航 + 用户操作）
 */
export function SiteHeader({ user }: { user: User }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setQ(params.get('q') ?? ''), [params]);
  // 路径变化关闭抽屉
  useEffect(() => setDrawerOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  // 抽屉打开时禁用滚动
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    if (!v) router.push('/#skill-library');
    else router.push(`/?q=${encodeURIComponent(v)}#skill-library`);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setMenuOpen(false);
    setDrawerOpen(false);
    router.refresh();
    router.push('/login');
  };

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

  return (
    <>
      <header className="relative z-30 border-b border-paper-edge bg-parchment/85 backdrop-blur-[2px]">
        <div className="mx-auto flex h-16 max-w-page items-center gap-6 px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-baseline gap-2.5 shrink-0">
            <span className="font-display tracking-display text-xl text-ink-brown">
              N.E.I.
            </span>
            <span className="hidden sm:inline font-serif italic text-xs text-sepia">
              The World of Financial Evolution
            </span>
          </Link>

          {/* 桌面：主导航 */}
          <nav className="hidden md:flex items-center gap-5 font-serif text-sm">
            <NavLink href="/" active={isActive('/')}>Skills 目录</NavLink>
            <NavLink href="/mcp-library" active={isActive('/mcp-library')}>MCP 库</NavLink>
            <NavLink href="/memory" active={isActive('/memory')}>Memory Node</NavLink>
            {user && (
              <NavLink href="/dashboard" active={isActive('/dashboard')}>控制台</NavLink>
            )}
          </nav>

          {/* 桌面：搜索框 */}
          {!isAuthPage && (
            <form
              onSubmit={onSearch}
              className="hidden md:flex flex-1 max-w-sm relative"
            >
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-sepia"
                aria-hidden="true"
              >
                <SearchIcon />
              </span>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜 BP 初筛、IC Memo、专家访谈..."
                className={cn(
                  'w-full h-9 bg-vellum border border-paper-edge pl-9 pr-3',
                  'font-serif italic text-sm text-ink-brown placeholder:text-sepia/70',
                  'focus:border-ink-brown focus:outline-none transition-colors',
                  'rounded-sm',
                )}
              />
            </form>
          )}

          {/* 桌面：用户区 */}
          <div className="ml-auto hidden md:flex items-center gap-4 font-sans text-sm">
            {user ? (
              <>
                <Link
                  href="/publish"
                  className="hidden sm:inline-flex items-center h-9 px-3 border border-ink-brown text-ink-brown font-serif italic hover:bg-ink-brown hover:text-vellum transition-colors rounded-sm"
                >
                  分享
                </Link>
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    className="flex items-center gap-2 py-1"
                  >
                    <RoleBadge role={user.role} size={18} />
                    <span className="text-ink-brown">{user.nickname}</span>
                    <Caret open={menuOpen} />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 border border-paper-edge bg-vellum rounded-md py-2">
                      <MenuItem href={`/profile/${user.id}`} onClose={() => setMenuOpen(false)}>
                        个人主页
                      </MenuItem>
                      <MenuItem href="/dashboard" onClose={() => setMenuOpen(false)}>
                        我的控制台
                      </MenuItem>
                      <MenuItem href="/connect" onClose={() => setMenuOpen(false)}>
                        连接配置
                      </MenuItem>
                      <MenuItem href="/settings" onClose={() => setMenuOpen(false)}>
                        设置
                      </MenuItem>
                      <MenuItem href="/publish" onClose={() => setMenuOpen(false)}>
                        发布
                      </MenuItem>
                      <div className="my-1 border-t border-paper-edge" />
                      <button
                        onClick={logout}
                        className="block w-full text-left px-4 py-2 text-wax-red hover:bg-linen font-serif"
                      >
                        退出
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="font-serif text-leather hover:text-ink-brown transition-colors">
                  登录
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center h-9 px-4 bg-ink-brown text-vellum hover:bg-wax-red font-serif rounded-sm transition-colors"
                >
                  加入
                </Link>
              </>
            )}
          </div>

          {/* 移动：汉堡按钮 */}
          <button
            onClick={() => setDrawerOpen((v) => !v)}
            className="ml-auto md:hidden inline-flex items-center justify-center w-9 h-9 text-ink-brown"
            aria-label="菜单"
            aria-expanded={drawerOpen}
          >
            {drawerOpen ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        </div>
      </header>

      {/* 移动：抽屉 */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-20 bg-parchment noise-paper">
          <div className="px-6 py-8 space-y-7">
            {/* 搜索 */}
            {!isAuthPage && (
              <form onSubmit={onSearch}>
                <div className="flex items-center gap-2 border-b-2 border-ink-brown pb-2">
                  <span className="text-leather" aria-hidden="true">
                    <SearchIcon />
                  </span>
                  <input
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="搜 BP 初筛、IC Memo、专家访谈..."
                    className="flex-1 bg-transparent border-0 outline-none font-serif italic text-lg text-ink-brown placeholder:text-sepia/60 py-1"
                  />
                </div>
              </form>
            )}

            {/* 主导航 */}
            <nav className="space-y-3">
              <DrawerLink href="/" active={isActive('/')}>Skills 目录</DrawerLink>
              <DrawerLink href="/mcp-library" active={isActive('/mcp-library')}>
                MCP 库
              </DrawerLink>
              <DrawerLink href="/memory" active={isActive('/memory')}>
                Memory Node
              </DrawerLink>
              {user && (
                <>
                  <DrawerLink href="/publish" active={isActive('/publish')}>
                    发布
                  </DrawerLink>
                  <DrawerLink href="/dashboard" active={isActive('/dashboard')}>
                    我的控制台
                  </DrawerLink>
                  <DrawerLink href="/connect" active={isActive('/connect')}>
                    连接配置
                  </DrawerLink>
                  <DrawerLink href="/settings" active={isActive('/settings')}>
                    设置
                  </DrawerLink>
                </>
              )}
            </nav>

            {/* 用户区 */}
            <div className="pt-5 border-t border-paper-edge">
              {user ? (
                <div className="space-y-3">
                  <Link
                    href={`/profile/${user.id}`}
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-3"
                  >
                    <RoleBadge role={user.role} size={22} />
                    <div>
                      <p className="font-serif text-lg text-ink-brown">
                        {user.nickname}
                      </p>
                      <p className="font-sans text-xs text-sepia">个人主页 →</p>
                    </div>
                  </Link>
                  <button
                    onClick={logout}
                    className="font-serif text-sm text-wax-red"
                  >
                    退出
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Link
                    href="/login"
                    onClick={() => setDrawerOpen(false)}
                    className="flex-1 inline-flex items-center justify-center h-10 px-4 border border-ink-brown text-ink-brown font-serif rounded-sm"
                  >
                    登录
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setDrawerOpen(false)}
                    className="flex-1 inline-flex items-center justify-center h-10 px-4 bg-ink-brown text-vellum font-serif rounded-sm"
                  >
                    加入
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'relative py-1',
        active ? 'text-ink-brown' : 'text-sepia hover:text-leather',
      )}
    >
      {children}
      {active && (
        <span className="absolute -bottom-px left-0 right-0 h-px bg-ink-brown" />
      )}
    </Link>
  );
}

function DrawerLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'block font-serif text-lg pb-2 border-b border-paper-edge',
        active ? 'text-ink-brown' : 'text-leather',
      )}
    >
      {children}
    </Link>
  );
}

function MenuItem({
  href,
  onClose,
  children,
}: {
  href: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="block px-4 py-2 font-serif text-sm text-ink-brown hover:bg-linen"
    >
      {children}
    </Link>
  );
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" className={cn('transition-transform', open && 'rotate-180')} aria-hidden="true">
      <path d="M2 3.5 L5 6.5 L8 3.5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5 L13.5 13.5" strokeLinecap="round" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
      <path d="M3 6 H17" />
      <path d="M3 10 H17" />
      <path d="M3 14 H17" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
      <path d="M3 3 L15 15" />
      <path d="M15 3 L3 15" />
    </svg>
  );
}
