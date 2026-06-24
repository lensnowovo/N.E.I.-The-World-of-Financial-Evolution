import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { cn } from '@/lib/cn';
import { stripHtml } from '@/lib/validate';
import { formatTime } from '@/lib/format';
import { PostCard, type PostCardData } from '@/components/PostCard';
import { RoleBadge } from '@/components/icons/RoleBadge';
import { CrestCorners } from '@/components/icons/Crest';
import { Ornament } from '@/components/icons/Ornament';
import { FollowButton } from '@/components/FollowButton';

const ROLE_FULL: Record<string, string> = {
  VC: 'Venture Capital',
  PE: 'Private Equity',
  FA: 'Financial Advisor',
};

type SP = { tab?: string };
type Tab = 'posts' | 'stars' | 'favorites';

const TAB_LABEL: Record<Tab, { numeral: string; label: string; subtitle: string; ownerOnly: boolean }> = {
  posts:     { numeral: 'I',   label: '发布',  subtitle: '已发布',   ownerOnly: false },
  stars:     { numeral: 'II',  label: 'Star',  subtitle: 'Star 过',  ownerOnly: true },
  favorites: { numeral: 'III', label: '收藏',  subtitle: '收藏',     ownerOnly: true },
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
  const tab = ((await searchParams).tab ?? 'posts') as Tab;

  // 非本人不允许访问私密 Tab
  if (!isOwner && TAB_LABEL[tab]?.ownerOnly) redirect(`/profile/${id}`);

  /* —— 计数 —— */
  const [postCount, starCount, favCount, receivedLikesAgg, followersCount, followingCount, myFollowRow] =
    await Promise.all([
      prisma.post.count({
        where: isOwner ? { userId: id } : { userId: id, status: 'published', deletedAt: null },
      }),
      isOwner ? prisma.postFavorite.count({ where: { userId: id } }) : Promise.resolve(0),
      isOwner ? prisma.postFavorite.count({ where: { userId: id } }) : Promise.resolve(0),
      // 该用户所有已发布卷收到的点赞合计（对外公开，需排除软删除帖）
      prisma.postFavorite.count({
        where: { post: { userId: id, status: 'published', deletedAt: null } },
      }),
      // 粉丝数
      prisma.userFollow.count({ where: { followeeId: id } }),
      // 该用户关注的人数
      prisma.userFollow.count({ where: { followerId: id } }),
      // 当前登录用户是否已关注此人
      me && !isOwner
        ? prisma.userFollow.findUnique({
            where: { followerId_followeeId: { followerId: me.id, followeeId: id } },
          })
        : Promise.resolve(null),
    ]);
  const receivedLikes = receivedLikesAgg;
  const isFollowing = !!myFollowRow;

  /* —— 取该 Tab 对应的内容 —— */
  let posts: any[] = [];
  if (tab === 'posts') {
    const where = isOwner ? { userId: id } : { userId: id, status: 'published', deletedAt: null };
    posts = await prisma.post.findMany({
      where,
      include: {
        author: { select: { id: true, nickname: true, role: true, avatarUrl: true } },
        _count: { select: { comments: true, stars: true, attachments: true } },
        skillAsset: { select: { id: true, assetType: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  } else if (tab === 'stars') {
    const likes = await prisma.postFavorite.findMany({
      where: { userId: id },
      include: {
        post: {
          include: {
            author: { select: { id: true, nickname: true, role: true, avatarUrl: true } },
            _count: { select: { comments: true, stars: true, attachments: true } },
            skillAsset: { select: { id: true, assetType: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    posts = likes.filter((l) => l.post.status === 'published').map((l) => l.post);
  } else if (tab === 'favorites') {
    const favs = await prisma.postFavorite.findMany({
      where: { userId: id },
      include: {
        post: {
          include: {
            author: { select: { id: true, nickname: true, role: true, avatarUrl: true } },
            _count: { select: { comments: true, stars: true, attachments: true } },
            skillAsset: { select: { id: true, assetType: true } },
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
  const myFavIds = me
    ? new Set(
        (
          await prisma.postFavorite.findMany({
            where: { userId: me.id, postId: { in: posts.map((p) => p.id) } },
            select: { postId: true },
          })
        ).map((f) => f.postId),
      )
    : new Set<number>();

  const items: PostCardData[] = posts.map((p) => ({
    id: p.id,
    title: p.title,
    excerpt: stripHtml(p.body).slice(0, 160),
    tagScene: p.tagScene,
    tagIndustry: p.tagIndustry,
    tagContent: (() => {
      try { return JSON.parse(p.tagContent || '[]'); } catch { return []; }
    })(),
    tagSkill: p.tagSkill,
    createdAt: p.createdAt.toISOString(),
    author: {
      id: p.author.id,
      nickname: p.author.nickname,
      role: p.author.role,
      avatarUrl: p.author.avatarUrl,
    },
    counts: {
      comments: p._count.comments,
      stars: p._count.stars,
      attachments: p._count.attachments,
    },
    viewCount: p.viewCount,
    starred: myStarredIds.has(p.id),
    skillAsset: p.skillAsset
      ? { id: p.skillAsset.id, assetType: p.skillAsset.assetType }
      : null,
  }));

  return (
    <div className="mx-auto max-w-prose">
      {/* ============ 纹章 Hero ============ */}
      <header className="relative border border-paper-edge bg-vellum rounded-md px-5 sm:px-8 py-8 sm:py-10 mb-10 text-center">
        <CrestCorners className="m-2" />

        <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-4">
          Collected Works
        </p>

        <div className="flex justify-center mb-5">
          <RoleBadge role={user.role} size={68} />
        </div>

        <h1 className="font-serif text-[26px] sm:text-[34px] leading-tight text-ink-brown break-all">
          {user.nickname}
        </h1>
        <p className="font-serif italic text-leather mt-1.5">
          {ROLE_FULL[user.role] ?? user.role}
          {user.institution && <span className="text-sepia"> · {user.institution}</span>}
        </p>
        {user.bio && (
          <p className="mt-3 font-sans text-sm text-leather leading-relaxed max-w-lg mx-auto">
            {user.bio}
          </p>
        )}

        {/* 本人主页：编辑资料入口 */}
        {isOwner && (
          <div className="mt-4">
            <Link
              href="/settings"
              className="inline-flex items-center h-8 px-4 border border-paper-edge text-leather hover:border-ink-brown hover:text-ink-brown font-serif text-sm rounded-sm transition-colors"
            >
              编辑资料
            </Link>
          </div>
        )}

        {/* —— 关注按钮（仅他人主页可见） —— */}
        {!isOwner && (
          <div className="mt-5">
            <FollowButton
              userId={user.id}
              initialFollowing={isFollowing}
              isAuthed={!!me}
            />
          </div>
        )}

        <div className="mt-5 flex justify-center text-sepia">
          <Ornament width={56} />
        </div>

        {/* —— 数据条 —— */}
        <dl className="mt-5 flex flex-wrap items-baseline justify-center gap-x-6 gap-y-2 font-sans text-xs text-sepia">
          <Stat n={postCount} label="发布" />
          <Sep dot />
          <Stat n={receivedLikes} label="获赞" />
          <Sep dot />
          <Stat n={followersCount} label="粉丝" />
          <Sep dot />
          <Stat n={followingCount} label="关注" />
          {isOwner && (
            <>
              <Sep dot />
              <Stat n={starCount} label="我的赞" />
              <Sep dot />
              <Stat n={favCount} label="收藏" />
            </>
          )}
        </dl>

        <p className="mt-3 font-serif italic text-xs text-sepia">
          执笔自 {formatTime(user.createdAt)}
        </p>
      </header>

      {/* ============ Tab 切换 ============ */}
      <nav className="flex justify-center items-baseline gap-0 mb-8 border-b border-paper-edge">
        <TabLink href={`/profile/${id}?tab=posts`} active={tab === 'posts'} numeral={TAB_LABEL.posts.numeral} count={postCount}>
          {TAB_LABEL.posts.label}
        </TabLink>
        {isOwner && (
          <>
            <Sep />
            <TabLink href={`/profile/${id}?tab=stars`} active={tab === 'stars'} numeral={TAB_LABEL.stars.numeral} count={starCount}>
              {TAB_LABEL.stars.label}
            </TabLink>
            <Sep />
            <TabLink href={`/profile/${id}?tab=favorites`} active={tab === 'favorites'} numeral={TAB_LABEL.favorites.numeral} count={favCount}>
              {TAB_LABEL.favorites.label}
            </TabLink>
          </>
        )}
      </nav>

      {/* ============ 内容 ============ */}
      {items.length === 0 ? (
        <EmptyTab tab={tab} isOwner={isOwner} />
      ) : (
        <ol className="space-y-5">
          {items.map((p, idx) => (
            <li key={p.id} className="relative">
              <span
                className="hidden lg:block absolute -left-12 top-7 font-display tracking-display text-xs text-sepia num-osf"
                aria-hidden="true"
              >
                {String(idx + 1).padStart(2, '0')}
              </span>
              <PostCard post={p} currentUserId={me?.id ?? null} />
            </li>
          ))}
        </ol>
      )}

      {/* —— 尾部 —— */}
      {items.length > 0 && (
        <footer className="mt-12 text-center">
          <div className="flex justify-center mb-3 text-leather">
            <Ornament width={48} />
          </div>
          <p className="font-serif italic text-sm text-sepia">
            共 <span className="num-osf">{items.length}</span> 条
          </p>
        </footer>
      )}
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

function Sep({ dot }: { dot?: boolean } = {}) {
  if (dot) return <span className="text-paper-edge select-none">·</span>;
  return <span className="h-3 w-px bg-paper-edge" />;
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="inline-flex items-baseline gap-1.5">
      <span className="num-osf font-serif text-base text-ink-brown">
        {formatStatNumber(n)}
      </span>
      <span className="font-serif text-[11px] text-sepia">{label}</span>
    </div>
  );
}

function formatStatNumber(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function EmptyTab({ tab, isOwner }: { tab: Tab; isOwner: boolean }) {
  const COPY: Record<Tab, { line: string; sub: string; cta?: { href: string; label: string } }> = {
    posts: {
      line: isOwner ? '还没有发布过内容' : '这个人还没有发布内容',
      sub:  isOwner ? '把好用的 prompt、模板、工作流分享出来吧' : '',
      cta:  isOwner ? { href: '/publish', label: '发布第一个' } : undefined,
    },
    stars: {
      line: '还没有点赞过内容',
      sub:  '看到有用的内容，点个赞就会在这里显示',
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
