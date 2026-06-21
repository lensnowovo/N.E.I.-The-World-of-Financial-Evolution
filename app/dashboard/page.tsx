export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { POST_STATUS } from '@/lib/status';
import { SCENE_TAGS, SKILL_TAGS } from '@/lib/tags';
import { stripHtml } from '@/lib/validate';
import { PostCard, type PostCardData } from '@/components/PostCard';

/**
 * /dashboard —— 我的控制台
 *
 * 三个区块：
 * 1. 快速配置（MCP 一键配置 Prompt + API key 状态）
 * 2. 我的 Skill 库（收藏的全部 Skill，不只是 prompt）
 * 3. 使用统计
 */
export default async function DashboardPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/dashboard');
  const uid = me.id;

  const userWithKey = await prisma.user.findUnique({
    where: { id: uid },
    select: { apiKeyEnc: true, mcpTokenHash: true },
  });
  const hasApiKey = !!userWithKey?.apiKeyEnc;
  const hasMcpToken = !!userWithKey?.mcpTokenHash;

  // 查收藏的全部 skill（不限 prompt 类型）
  const favs = await prisma.postFavorite.findMany({
    where: { userId: uid },
    include: {
      post: {
        include: {
          author: { select: { id: true, nickname: true, role: true, avatarUrl: true } },
          _count: { select: { comments: true, likes: true, attachments: true } },
          skillAsset: { select: { id: true, assetType: true, originalAuthor: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const allSkills: PostCardData[] = favs
    .filter((f) => f.post.status === POST_STATUS.PUBLISHED)
    .map((f) => ({
      id: f.post.id,
      title: f.post.title,
      excerpt: stripHtml(f.post.body).slice(0, 160),
      tagScene: f.post.tagScene,
      tagIndustry: f.post.tagIndustry,
      tagContent: (() => { try { return JSON.parse(f.post.tagContent || '[]'); } catch { return []; } })(),
      tagSkill: f.post.tagSkill,
      createdAt: f.post.createdAt.toISOString(),
      viewCount: f.post.viewCount,
      author: f.post.author,
      counts: {
        comments: f.post._count.comments,
        likes: f.post._count.likes,
        attachments: f.post._count.attachments,
      },
      liked: false,
      favorited: true,
      skillAsset: f.post.skillAsset
        ? { id: f.post.skillAsset.id, assetType: f.post.skillAsset.assetType, originalAuthor: f.post.skillAsset.originalAuthor }
        : null,
    }));

  // 按场景分组
  const sceneLabelMap = new Map<string, string>(SCENE_TAGS.map((t) => [t.value, t.label]));
  const grouped = new Map<string, PostCardData[]>();
  for (const p of allSkills) {
    const arr = grouped.get(p.tagScene) || [];
    arr.push(p);
    grouped.set(p.tagScene, arr);
  }

  // 统计
  const userStats = await prisma.user.findUnique({
    where: { id: uid },
    select: {
      _count: {
        select: {
          posts: { where: { status: 'published' } },
          favorites: true,
          likes: true,
        },
      },
    },
  }) || { _count: { posts: 0, favorites: 0, likes: 0 } };

  // MCP 一键配置 Prompt（post #44）
  const mcpSetupPost = await prisma.post.findFirst({
    where: { title: { contains: '一键配置 Prompt' }, status: 'published' },
    select: { id: true },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://n-e-i-the-world-of-financial-evolut.vercel.app';

  return (
    <div className="mx-auto max-w-page px-4 sm:px-6 py-8">
      {/* 头部 */}
      <div className="mb-6 pb-5 border-b border-paper-edge">
        <Link href="/" className="inline-flex items-center gap-1.5 font-serif italic text-sm text-sepia hover:text-ink-brown mb-3">
          ← 返回首页
        </Link>
        <div className="flex items-baseline gap-3">
          <h1 className="font-serif text-3xl text-ink-brown">我的控制台</h1>
          <span className="font-mono text-sm text-sepia">{allSkills.length} 个 Skill</span>
        </div>
      </div>

      {/* —— 区块 1：快速配置 —— */}
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* MCP 配置卡片 */}
          <div className={`rounded-lg border-2 p-5 ${hasMcpToken ? 'border-moss/40 bg-moss/5' : 'border-gilded/40 bg-gilded/5'}`}>
            <div className="flex items-center gap-2 mb-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={hasMcpToken ? 'currentColor' : 'currentColor'} strokeWidth="1.5" className={hasMcpToken ? 'text-moss' : 'text-gilded'}>
                <path d="M12 2 L2 7 L12 12 L22 7 Z" strokeLinejoin="round" />
                <path d="M2 17 L12 22 L22 17" strokeLinejoin="round" />
                <path d="M2 12 L12 17 L22 12" strokeLinejoin="round" />
              </svg>
              <h3 className="font-serif text-base text-ink-brown">MCP 连接</h3>
            </div>
            {hasMcpToken ? (
              <p className="font-sans text-xs text-leather mb-3">✅ MCP Token 已配置，客户端可以连了</p>
            ) : (
              <p className="font-sans text-xs text-leather mb-3">让你的 AI 客户端（Claude Code / Cursor）直接搜索和调用 N.E.I. 的 Skill</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Link
                href="/connect"
                className="inline-flex items-center h-7 px-3 text-xs font-sans border border-paper-edge rounded-sm text-leather hover:border-ink-brown hover:text-ink-brown transition-colors"
              >
                {hasMcpToken ? '管理 Token' : '生成 Token'}
              </Link>
              {mcpSetupPost && (
                <Link
                  href={`/posts/${mcpSetupPost.id}`}
                  className="inline-flex items-center h-7 px-3 text-xs font-sans bg-wax-red text-vellum rounded-sm hover:bg-ink-brown transition-colors"
                >
                  一键配置 →
                </Link>
              )}
            </div>
          </div>

          {/* API Key 卡片 */}
          <div className={`rounded-lg border-2 p-5 ${hasApiKey ? 'border-moss/40 bg-moss/5' : 'border-paper-edge bg-vellum/40'}`}>
            <div className="flex items-center gap-2 mb-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={hasApiKey ? 'text-moss' : 'text-sepia'}>
                <circle cx="8" cy="15" r="4" />
                <path d="M10.8 12.2 L19 4 M18 5 L21 8 M15 8 L17 6" strokeLinecap="round" />
              </svg>
              <h3 className="font-serif text-base text-ink-brown">网站执行</h3>
            </div>
            <p className="font-sans text-xs text-leather mb-3">
              {hasApiKey ? '✅ API Key 已配置，可在网站直接执行 Prompt' : '配置后可在网站直接执行 Prompt（流式输出）'}
            </p>
            <Link
              href="/connect"
              className="inline-flex items-center h-7 px-3 text-xs font-sans border border-paper-edge rounded-sm text-leather hover:border-ink-brown hover:text-ink-brown transition-colors"
            >
              {hasApiKey ? '管理 Key' : '去配置'}
            </Link>
          </div>

          {/* 统计卡片 */}
          <div className="rounded-lg border-2 border-paper-edge bg-vellum/40 p-5">
            <div className="flex items-center gap-2 mb-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-sepia">
                <path d="M3 3 V21 H21" strokeLinecap="round" />
                <path d="M7 14 L11 9 L15 12 L21 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h3 className="font-serif text-base text-ink-brown">我的数据</h3>
            </div>
            <div className="space-y-1 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-sepia">已发布</span>
                <span className="text-ink-brown num-osf">{userStats._count.posts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sepia">收藏</span>
                <span className="text-ink-brown num-osf">{allSkills.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sepia">点赞</span>
                <span className="text-ink-brown num-osf">{userStats._count.likes}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* —— 区块 2：我的 Skill 库 —— */}
      <section>
        <div className="flex items-baseline gap-3 mb-5">
          <h2 className="font-serif text-xl text-ink-brown">我的 Skill 库</h2>
          <span className="font-mono text-[11px] text-sepia">{allSkills.length}</span>
          <span className="flex-1 h-px bg-paper-edge" />
          <Link href="/" className="font-serif italic text-xs text-sepia hover:text-ink-brown">
            去发现更多 →
          </Link>
        </div>

        {allSkills.length === 0 ? (
          <div className="border border-paper-edge bg-vellum rounded-md py-14 px-8 text-center">
            <p className="font-serif italic text-leather text-lg mb-2">
              还没有收藏 Skill
            </p>
            <p className="font-sans text-sm text-sepia mb-6">
              去首页发现有用的 Prompt / 模板 / 工作流，点「收藏」就会出现在这里
            </p>
            <Link
              href="/"
              className="inline-flex items-center h-9 px-4 bg-ink-brown text-vellum hover:bg-wax-red font-serif text-sm rounded-sm transition-colors"
            >
              去发现
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {Array.from(grouped.entries()).map(([scene, items]) => (
              <div key={scene}>
                <div className="flex items-baseline gap-3 mb-4">
                  <h3 className="font-serif text-lg text-ink-brown">
                    {sceneLabelMap.get(scene) || scene}
                  </h3>
                  <span className="font-mono text-[11px] text-sepia">{items.length}</span>
                  <span className="flex-1 h-px bg-paper-edge" />
                </div>
                <ol className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {items.map((p, i) => (
                    <li key={p.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i * 40, 320)}ms` }}>
                      <PostCard post={p} currentUserId={uid} variant="compact" />
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
