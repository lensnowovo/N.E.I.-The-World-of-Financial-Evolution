import Link from 'next/link';
import { RoleBadge } from '@/components/icons/RoleBadge';
import { roleLabel } from '@/lib/roles';

export type HomeSideDockData = {
  user: {
    id: number;
    nickname: string;
    role: string;
    institution: string | null;
    avatarUrl: string | null;
    githubAvatarUrl: string | null;
    hasMcpToken: boolean;
    tokenLastUsedAt: Date | null;
  } | null;
  stats: {
    favoriteCount: number;
    postCount: number;
    mcpReadyCount: number;
    todayNewCount: number;
  };
};

export function HomeSideDock({ data }: { data: HomeSideDockData }) {
  return (
    <aside
      aria-label="Investor dossier"
      className="hidden [@media(min-width:1760px)]:block fixed top-28 right-[max(1.5rem,calc((100vw-1200px)/2-20rem))] z-20 w-[280px]"
    >
      <div className="relative border border-paper-edge bg-vellum/88 backdrop-blur-[2px] shadow-card">
        <div className="absolute inset-x-4 top-0 h-px bg-gilded/50" />
        <div className="p-4">
          <div className="mb-4 flex items-center justify-between border-b border-paper-edge pb-3">
            <div>
              <p className="font-display text-[10px] tracking-display text-sepia">DOSSIER</p>
              <h2 className="font-serif text-lg leading-tight text-ink-brown">Investor Desk</h2>
            </div>
            <span className="font-mono text-[10px] text-sepia">N.E.I.</span>
          </div>

          {data.user ? <SignedInDock data={data} /> : <GuestDock todayNewCount={data.stats.todayNewCount} />}
        </div>
      </div>
    </aside>
  );
}

function SignedInDock({ data }: { data: HomeSideDockData }) {
  const user = data.user!;
  const avatar = user.avatarUrl || user.githubAvatarUrl;
  const mcpReady = user.hasMcpToken;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-content-center overflow-hidden rounded-full border border-gilded/50 bg-parchment text-ink-brown">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-serif text-xl">{user.nickname.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-serif text-base text-ink-brown">{user.nickname}</p>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-sepia">
            <RoleBadge role={user.role} size={14} />
            <span>{roleLabel(user.role)}</span>
          </div>
          {user.institution && (
            <p className="mt-1 truncate font-sans text-[11px] text-sepia">{user.institution}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 border-y border-paper-edge py-3 text-center">
        <MiniStat value={data.stats.favoriteCount} label="收藏" />
        <MiniStat value={data.stats.postCount} label="投稿" />
        <MiniStat value={data.stats.mcpReadyCount} label="MCP" />
      </div>

      <div className="border border-paper-edge bg-parchment/55 px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-[10px] tracking-display text-sepia">MCP STATUS</p>
            <p className="mt-0.5 font-serif text-sm text-ink-brown">
              {mcpReady ? 'Token Ready' : '尚未配置'}
            </p>
          </div>
          <span
            className={
              mcpReady
                ? 'h-2.5 w-2.5 rounded-full bg-moss'
                : 'h-2.5 w-2.5 rounded-full border border-sepia'
            }
          />
        </div>
        <p className="mt-2 font-sans text-[11px] leading-relaxed text-sepia">
          {mcpReady
            ? user.tokenLastUsedAt
              ? `最近调用 ${formatDate(user.tokenLastUsedAt)}`
              : '可接入 Claude Code / Codex / Workbuddy'
            : '生成 Token 后，可在客户端调用收藏库。'}
        </p>
      </div>

      <nav className="space-y-1.5" aria-label="Dossier shortcuts">
        <DockLink href="/dashboard" label="我的收藏库" meta="Library" />
        <DockLink href="/connect" label="配置 MCP" meta={mcpReady ? 'Ready' : 'Setup'} />
        <DockLink href="/publish" label="发布 Skill" meta="Contribute" />
        <DockLink href={`/profile/${user.id}`} label="个人主页" meta="Profile" />
      </nav>
    </div>
  );
}

function GuestDock({ todayNewCount }: { todayNewCount: number }) {
  return (
    <div className="space-y-4">
      <div className="border-b border-paper-edge pb-4">
        <p className="font-serif text-base leading-snug text-ink-brown">保存你的 Skill Library</p>
        <p className="mt-2 font-sans text-xs leading-relaxed text-sepia">
          登录后收藏 Skill，并通过 MCP 在工作客户端中调用。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/login"
          className="inline-flex h-9 items-center justify-center border border-ink-brown bg-ink-brown px-3 font-serif text-sm text-vellum transition-colors hover:bg-wax-red"
        >
          登录
        </Link>
        <Link
          href="/register"
          className="inline-flex h-9 items-center justify-center border border-ink-brown px-3 font-serif text-sm text-ink-brown transition-colors hover:bg-ink-brown hover:text-vellum"
        >
          注册
        </Link>
      </div>

      <div className="border-t border-paper-edge pt-3">
        <p className="font-display text-[10px] tracking-display text-sepia">TODAY</p>
        <p className="mt-1 font-serif text-sm text-ink-brown">
          今日新增 <span className="num-osf text-lg">{todayNewCount}</span> 个 Skill
        </p>
      </div>
    </div>
  );
}

function MiniStat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="font-serif text-xl leading-none text-ink-brown num-osf">{value}</p>
      <p className="mt-1 font-sans text-[10px] text-sepia">{label}</p>
    </div>
  );
}

function DockLink({ href, label, meta }: { href: string; label: string; meta: string }) {
  return (
    <Link
      href={href}
      className="group flex h-9 items-center justify-between border border-paper-edge bg-vellum px-3 transition-colors hover:border-ink-brown hover:bg-parchment"
    >
      <span className="font-serif text-sm text-ink-brown">{label}</span>
      <span className="font-mono text-[10px] text-sepia group-hover:text-leather">{meta}</span>
    </Link>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
