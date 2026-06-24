import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getSessionUid } from '@/lib/session';
import { stripHtml } from '@/lib/validate';
import { STAGE_GROUPS } from '@/lib/tags';
import { POST_STATUS } from '@/lib/status';
import { PostCard } from '@/components/PostCard';
import { normalizeSort, sortPosts } from '@/lib/feed';

const PAGE_SIZE = 12;

/**
 * /stage/[value] —— 某投资流程阶段的全部内容（带分页）
 *
 * 从首页阶段分组的「查看全部」跳转过来。展示该阶段所有场景的内容，
 * 按热门/最新排序，URL 分页（?page=2）。
 */
export default async function StagePage({
  params,
  searchParams,
}: {
  params: Promise<{ value: string }>;
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const { value: stageValue } = await params;
  const stage = STAGE_GROUPS.find((s) => s.value === stageValue);
  if (!stage) {
    return (
      <div className="mx-auto max-w-page px-4 sm:px-6 py-20 text-center">
        <h1 className="font-serif text-2xl text-ink-brown mb-4">阶段不存在</h1>
        <Link href="/" className="font-serif italic text-sm text-sepia hover:text-ink-brown">← 返回首页</Link>
      </div>
    );
  }

  const uid = await getSessionUid();
  const sp = await searchParams;
  const sort = normalizeSort(sp.sort);
  const page = Math.max(1, parseInt((sp.page as string) || '1', 10));
  const scenes = stage.scenes as readonly string[];

  // 查询该阶段所有场景的内容
  let posts = await prisma.post.findMany({
    where: { status: POST_STATUS.PUBLISHED, deletedAt: null, tagScene: { in: [...scenes] } },
    include: {
      author: { select: { id: true, nickname: true, role: true, avatarUrl: true } },
      _count: { select: { comments: true, stars: true, attachments: true } },
      skillAsset: { select: { id: true, assetType: true, originalAuthor: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const total = posts.length;
  posts = sortPosts(posts, sort);
  const paged = posts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const items = paged.map((p) => ({
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
    viewCount: p.viewCount,
    author: p.author,
    counts: {
      comments: p._count.comments,
      stars: p._count.stars,
      attachments: p._count.attachments,
    },
    starred: false,
    skillAsset: p.skillAsset
      ? { id: p.skillAsset.id, assetType: p.skillAsset.assetType, originalAuthor: p.skillAsset.originalAuthor }
      : null,
  }));

  const sortParam = sort === 'latest' ? '&sort=latest' : '';

  return (
    <div className="mx-auto max-w-page px-4 sm:px-6 py-6">
      {/* —— 头部 —— */}
      <div className="mb-6 pb-5 border-b border-paper-edge">
        <Link href="/" className="inline-flex items-center gap-1.5 font-serif italic text-sm text-sepia hover:text-ink-brown transition-colors mb-3">
          ← 返回首页
        </Link>
        <div className="flex items-baseline gap-3">
          <h1 className="font-serif text-2xl text-ink-brown">{stage.label}</h1>
          <span className="font-mono text-sm text-sepia">{total} 个</span>
        </div>
      </div>

      {/* —— 排序 —— */}
      <div className="mb-4 flex items-center gap-3">
        <span className="font-sans text-[11px] text-sepia uppercase tracking-wide">排序</span>
        <div className="inline-flex border border-paper-edge rounded-sm overflow-hidden">
          <SortLink href={`/stage/${stageValue}`} active={sort !== 'latest'}>热门</SortLink>
          <SortLink href={`/stage/${stageValue}?sort=latest`} active={sort === 'latest'}>最新</SortLink>
        </div>
      </div>

      {/* —— 卡片网格 —— */}
      <ol className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((p, i) => (
          <li key={p.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i * 40, 320)}ms` }}>
            <PostCard post={p} currentUserId={uid} variant="compact" />
          </li>
        ))}
      </ol>

      {/* —— 分页 —— */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          {page > 1 ? (
            <Link
              href={`/stage/${stageValue}?page=${page - 1}${sortParam}`}
              className="inline-flex items-center h-9 px-4 border border-paper-edge hover:border-ink-brown font-serif text-sm text-leather hover:text-ink-brown rounded-sm transition-colors"
            >
              ← 上一页
            </Link>
          ) : (
            <span className="inline-flex items-center h-9 px-4 border border-paper-edge/50 font-serif text-sm text-sepia/40 rounded-sm">
              ← 上一页
            </span>
          )}
          <span className="font-mono text-sm text-sepia">
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/stage/${stageValue}?page=${page + 1}${sortParam}`}
              className="inline-flex items-center h-9 px-4 border border-paper-edge hover:border-ink-brown font-serif text-sm text-leather hover:text-ink-brown rounded-sm transition-colors"
            >
              下一页 →
            </Link>
          ) : (
            <span className="inline-flex items-center h-9 px-4 border border-paper-edge/50 font-serif text-sm text-sepia/40 rounded-sm">
              下一页 →
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function SortLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center px-3 h-7 text-xs font-sans transition-colors ${
        active ? 'bg-ink-brown text-vellum' : 'bg-vellum text-leather hover:text-ink-brown'
      }`}
    >
      {children}
    </Link>
  );
}
