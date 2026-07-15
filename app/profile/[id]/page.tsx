import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';
import { mapPostToCardData } from '@/lib/feed';
import { industryLabel, sceneLabel } from '@/lib/tags';
import { roleFullName as investorRoleFullName } from '@/lib/roles';
import { PostCard } from '@/components/PostCard';
import { RoleBadge } from '@/components/icons/RoleBadge';
import { FollowButton } from '@/components/FollowButton';

type SP = { tab?: string };
type Tab = 'posts' | 'favorites';

const TAB_LABEL: Record<Tab, { numeral: string; label: string; subtitle: string; ownerOnly: boolean }> = {
  posts:     { numeral: 'I',   label: '发布',  subtitle: '已发布',   ownerOnly: false },
  favorites: { numeral: 'II', label: '收藏',  subtitle: '收藏',     ownerOnly: true },
};

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SP>;
}) {
  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) notFound();

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();

  const me = await getCurrentUser();
  const isOwner = me?.id === id;
  const requestedTab = (await searchParams).tab;
  const tab: Tab = requestedTab === 'favorites' ? 'favorites' : 'posts';

  // 非本人不允许访问私密 Tab
  if (!isOwner && TAB_LABEL[tab]?.ownerOnly) redirect(`/profile/${id}`);

  /* —— 计数 —— */
  const [
    postCount,
    favCount,
    receivedFavoritesCount,
    followersCount,
    followingCount,
    workflowCount,
    mcpReadyCount,
    featuredCount,
    focusRows,
    myFollowRow,
  ] =
    await Promise.all([
      prisma.post.count({ where: { userId: id, status: 'published', deletedAt: null } }),
      isOwner ? prisma.postFavorite.count({ where: { userId: id } }) : Promise.resolve(0),
      // 该用户所有公开内容被收藏的次数。
      prisma.postFavorite.count({
        where: { post: { userId: id, status: 'published', deletedAt: null } },
      }),
      // 粉丝数
      prisma.userFollow.count({ where: { followeeId: id } }),
      // 该用户关注的人数
      prisma.userFollow.count({ where: { followerId: id } }),
      prisma.post.count({
        where: {
          userId: id,
          status: 'published',
          skillAsset: { is: { assetType: 'workflow' } },
        },
      }),
      prisma.post.count({
        where: {
          userId: id,
          status: 'published',
          mcpApproved: true,
          skillAsset: { isNot: null },
        },
      }),
      prisma.post.count({
        where: {
          userId: id,
          status: 'published',
          featured: true,
        },
      }),
      prisma.post.findMany({
        where: { userId: id, status: 'published' },
        select: { tagScene: true, tagIndustry: true },
        orderBy: { createdAt: 'desc' },
        take: 80,
      }),
      // 当前登录用户是否已关注此人
      me && !isOwner
        ? prisma.userFollow.findUnique({
            where: { followerId_followeeId: { followerId: me.id, followeeId: id } },
          })
        : Promise.resolve(null),
    ]);
  const isFollowing = !!myFollowRow;
  const profileBadges = getProfileBadges({
    postCount,
    workflowCount,
    mcpReadyCount,
    featuredCount,
    isAdmin: user.isAdmin,
  });
  const focusScenes = topLabels(
    focusRows.map((row) => row.tagScene),
    sceneLabel,
  );
  const focusIndustries = topLabels(
    focusRows.map((row) => row.tagIndustry).filter(Boolean) as string[],
    industryLabel,
  );

  /* —— 取该 Tab 对应的内容 —— */
  let posts: any[] = [];
  if (tab === 'posts') {
    const where = { userId: id, status: 'published', deletedAt: null };
    posts = await prisma.post.findMany({
      where,
      include: {
        author: { select: { id: true, nickname: true, role: true, avatarUrl: true } },
        _count: { select: { comments: true, stars: true, attachments: true } },
        skillAsset: {
          select: {
            id: true,
            assetType: true,
            originalAuthor: true,
            sourceUrl: true,
            installHint: true,
            usageNotes: true,
          },
        },
      },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });
  } else if (tab === 'favorites') {
    const favs = await prisma.postFavorite.findMany({
      where: { userId: id },
      include: {
        post: {
          include: {
            author: { select: { id: true, nickname: true, role: true, avatarUrl: true } },
            _count: { select: { comments: true, stars: true, attachments: true } },
            skillAsset: {
              select: {
                id: true,
                assetType: true,
                originalAuthor: true,
                sourceUrl: true,
                installHint: true,
                usageNotes: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    posts = favs.filter((f) => f.post.status === 'published').map((f) => f.post);
  }

  /* —— 我对这些 post 的点赞/收藏（用于卡片态） —— */
  const myStarredIds = me
    ? new Set(
        (
          await prisma.postFavorite.findMany({
            where: { userId: me.id, postId: { in: posts.map((p) => p.id) } },
            select: { postId: true },
          })
        ).map((l) => l.postId),
      )
    : new Set<number>();
  const items = posts.map((p) => mapPostToCardData(p, myStarredIds.has(p.id)));

  return (
    <div className="mx-auto max-w-page px-4 py-8 sm:px-6 sm:py-10">
      <header className="relative mb-9 overflow-hidden border-y border-paper-edge bg-vellum/55">
        <div className="pointer-events-none absolute -right-5 top-0 font-serif text-[96px] leading-none tracking-[-0.06em] text-gilded opacity-[0.055] sm:text-[150px]" aria-hidden="true">
          PROFILE
        </div>
        <div className="relative grid lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
          <div className="px-5 py-7 sm:px-8 sm:py-9 lg:pr-12">
            <div className="mb-5 flex items-center gap-4">
              <RoleBadge role={user.role} size={58} />
              <div className="min-w-0">
                <p className="mb-1 font-display text-[10px] uppercase tracking-[0.22em] text-gilded">Contributor profile</p>
                <h1 className="break-words font-serif text-[30px] leading-tight text-ink-brown sm:text-[40px]">{user.nickname}</h1>
                <p className="mt-1 font-serif text-sm italic text-leather">
                  {investorRoleFullName(user.role)}
                  {user.institution && <span className="text-sepia"> · {user.institution}</span>}
                </p>
              </div>
            </div>

            {user.bio && <p className="max-w-2xl font-sans text-sm leading-7 text-leather">{user.bio}</p>}

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {isOwner ? (
                <>
                  <Link href="/settings" className="inline-flex h-9 items-center border border-ink-brown bg-ink-brown px-4 font-serif text-sm text-parchment transition-colors hover:bg-sepia">编辑资料</Link>
                  <Link href="/dashboard" className="inline-flex h-9 items-center border border-paper-edge bg-vellum px-4 font-serif text-sm text-leather transition-colors hover:border-ink-brown hover:text-ink-brown">我的工作台</Link>
                  <span className="ml-1 font-sans text-xs text-sepia">私有收藏 {favCount}</span>
                </>
              ) : (
                <FollowButton userId={user.id} initialFollowing={isFollowing} isAuthed={!!me} />
              )}
            </div>

            {(focusScenes.length > 0 || focusIndustries.length > 0) && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {focusScenes.length > 0 && <ProfileFocus title="常写任务" items={focusScenes} />}
                {focusIndustries.length > 0 && <ProfileFocus title="关注赛道" items={focusIndustries} />}
              </div>
            )}
          </div>

          <aside className="border-t border-paper-edge bg-parchment/35 px-5 py-7 sm:px-7 lg:border-l lg:border-t-0">
            <div className="flex items-baseline justify-between border-b border-paper-edge pb-3">
              <p className="font-display text-[10px] uppercase tracking-[0.2em] text-sepia">Contribution record</p>
              <span className="font-mono text-[10px] text-gilded">#{String(user.id).padStart(4, '0')}</span>
            </div>
            <dl className="grid grid-cols-2 gap-px bg-paper-edge my-5 border border-paper-edge">
              <ProfileMetric n={postCount} label="公开发布" />
              <ProfileMetric n={workflowCount} label="工作流" />
              <ProfileMetric n={receivedFavoritesCount} label="被收藏" />
              <ProfileMetric n={followersCount} label="关注者" />
            </dl>
            <div className="space-y-2">
              {profileBadges.map((badge) => (
                <div key={badge.label} className="flex items-center justify-between gap-3 border-b border-paper-edge/70 pb-2 last:border-0">
                  <span className="font-serif text-sm text-ink-brown">{badge.label}</span>
                  <span className="font-mono text-[10px] text-sepia">{badge.detail}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 font-serif text-xs italic text-sepia">加入于 {formatTime(user.createdAt)} · 关注 {followingCount}</p>
          </aside>
        </div>
      </header>

      <div className="mb-6 flex flex-col gap-3 border-b border-paper-edge sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-[10px] uppercase tracking-[0.2em] text-gilded">Selected work</p>
          <h2 className="mt-1 font-serif text-2xl text-ink-brown">贡献与作品</h2>
        </div>
        <nav className="flex items-baseline" aria-label="个人主页内容">
          <TabLink href={`/profile/${id}?tab=posts`} active={tab === 'posts'} numeral={TAB_LABEL.posts.numeral} count={postCount}>{TAB_LABEL.posts.label}</TabLink>
          {isOwner && (
            <>
              <Sep />
              <TabLink href={`/profile/${id}?tab=favorites`} active={tab === 'favorites'} numeral={TAB_LABEL.favorites.numeral} count={favCount}>{TAB_LABEL.favorites.label}</TabLink>
            </>
          )}
        </nav>
      </div>

      {items.length === 0 ? (
        <EmptyTab tab={tab} isOwner={isOwner} />
      ) : (
        <ol className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((post) => (
            <li key={post.id} className="min-w-0">
              <PostCard post={post} currentUserId={me?.id ?? null} variant="shelf" />
            </li>
          ))}
        </ol>
      )}

      {items.length > 0 && <p className="mt-8 border-t border-paper-edge pt-4 text-right font-serif text-sm italic text-sepia">共 {items.length} 条公开记录</p>}
    </div>
  );
}

/* ============================================================
   局部组件
   ============================================================ */
function TabLink({
  href,
  active,
  numeral,
  count,
  children,
}: {
  href: string;
  active: boolean;
  numeral: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative inline-flex items-baseline gap-2 px-5 py-3 transition-colors',
        active ? 'text-ink-brown' : 'text-sepia hover:text-leather',
      )}
    >
      <span className="font-display tracking-display text-[11px]">{numeral}</span>
      <span className="font-serif text-base">{children}</span>
      <span className="font-sans text-[11px] text-sepia num-osf">
        {count}
      </span>
      {active && (
        <span className="absolute -bottom-px left-3 right-3 h-px bg-ink-brown" />
      )}
    </Link>
  );
}

function Sep() {
  return <span className="h-3 w-px bg-paper-edge" />;
}

function ProfileMetric({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex flex-col bg-vellum/80 px-3 py-3">
      <dt className="order-2 mt-1 font-sans text-[10px] text-sepia">{label}</dt>
      <dd className="order-1 num-osf font-serif text-2xl text-ink-brown">{formatStatNumber(n)}</dd>
    </div>
  );
}

function formatStatNumber(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function ProfileFocus({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-paper-edge bg-parchment/45 px-3 py-2">
      <p className="mb-1 font-display tracking-display text-[10px] uppercase text-sepia">
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center h-6 px-2 rounded-sm border border-paper-edge bg-vellum font-sans text-[11px] text-leather"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function getProfileBadges({
  postCount,
  workflowCount,
  mcpReadyCount,
  featuredCount,
  isAdmin,
}: {
  postCount: number;
  workflowCount: number;
  mcpReadyCount: number;
  featuredCount: number;
  isAdmin: boolean;
}) {
  const badges: { label: string; detail: string }[] = [];
  if (isAdmin || featuredCount > 0) badges.push({ label: 'N.E.I. 精选贡献者', detail: `${featuredCount} 项精选` });
  if (postCount > 0) badges.push({ label: '内容贡献者', detail: `${postCount} 项公开` });
  if (workflowCount > 0) badges.push({ label: '工作流作者', detail: `${workflowCount} 项` });
  if (mcpReadyCount > 0) badges.push({ label: 'MCP Ready', detail: `${mcpReadyCount} 项可调用` });
  if (postCount === 0) badges.push({ label: 'N.E.I. 成员', detail: '尚未发布' });
  return badges.slice(0, 4);
}

function topLabels(values: string[], labeler: (value: string) => string) {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    if (!value) return;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([value]) => labeler(value));
}

function EmptyTab({ tab, isOwner }: { tab: Tab; isOwner: boolean }) {
  const COPY: Record<Tab, { line: string; sub: string; cta?: { href: string; label: string } }> = {
    posts: {
      line: isOwner ? '还没有发布过内容' : '这个人还没有发布内容',
      sub:  isOwner ? '把好用的 prompt、模板、工作流分享出来吧' : '',
      cta:  isOwner ? { href: '/publish', label: '发布第一个' } : undefined,
    },
    favorites: {
      line: '还没有收藏内容',
      sub:  '收藏值得反复用的内容，方便以后查找',
    },
  };
  const c = COPY[tab];

  return (
    <div className="border border-paper-edge bg-vellum rounded-md py-14 px-8 text-center">
      <div className="flex justify-center mb-5 text-paper-edge">
        <BlankFolio />
      </div>
      <p className="font-serif italic text-leather text-lg mb-2">{c.line}</p>
      <p className="font-sans text-sm text-sepia">{c.sub}</p>
      {c.cta && (
        <div className="mt-6">
          <Link
            href={c.cta.href}
            className="inline-flex items-center h-9 px-4 bg-ink-brown text-vellum hover:bg-wax-red font-serif text-sm rounded-sm transition-colors"
          >
            {c.cta.label}
          </Link>
        </div>
      )}
    </div>
  );
}

/** 空白对开页 —— 两页相连的素描 */
function BlankFolio() {
  return (
    <svg width="72" height="56" viewBox="0 0 72 56" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
      <rect x="2" y="4" width="32" height="48" />
      <rect x="38" y="4" width="32" height="48" />
      {/* 中缝 */}
      <path d="M34 4 V52" opacity="0.6" />
      {/* 左页书脊三横线 */}
      <path d="M6 14 H30" opacity="0.5" />
      <path d="M6 18 H30" opacity="0.5" />
      <path d="M6 22 H22" opacity="0.5" />
      {/* 右页书脊三横线 */}
      <path d="M42 14 H66" opacity="0.5" />
      <path d="M42 18 H66" opacity="0.5" />
      <path d="M42 22 H58" opacity="0.5" />
    </svg>
  );
}
