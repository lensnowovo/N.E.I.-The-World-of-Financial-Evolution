export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { POST_STATUS } from '@/lib/status';
import { SCENE_TAGS } from '@/lib/tags';
import { stripHtml } from '@/lib/validate';
import { PostCard, type PostCardData } from '@/components/PostCard';

/**
 * /dashboard —— 我的控制台
 *
 * 展示用户收藏的 prompt 类 skill，每个都可以直接执行。
 */
export default async function DashboardPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/dashboard');
  const uid = me.id;

  // 查用户是否配了 API key
  const userWithKey = await prisma.user.findUnique({
    where: { id: uid },
    select: { apiKeyEnc: true },
  });
  const hasApiKey = !!userWithKey?.apiKeyEnc;

  // 查收藏的 prompt 类型 skill
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

  // 过滤出已发布 + prompt 类型
  const promptSkills: PostCardData[] = favs
    .filter((f) => f.post.status === POST_STATUS.PUBLISHED && f.post.tagSkill === 'prompt')
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
  for (const p of promptSkills) {
    const arr = grouped.get(p.tagScene) || [];
    arr.push(p);
    grouped.set(p.tagScene, arr);
  }

  return (
    <div className="mx-auto max-w-page px-4 sm:px-6 py-8">
      {/* 头部 */}
      <div className="mb-6 pb-5 border-b border-paper-edge">
        <Link href="/" className="inline-flex items-center gap-1.5 font-serif italic text-sm text-sepia hover:text-ink-brown mb-3">
          ← 返回首页
        </Link>
        <div className="flex items-baseline gap-3">
          <h1 className="font-serif text-3xl text-ink-brown">我的控制台</h1>
          <span className="font-mono text-sm text-sepia">{promptSkills.length} 个 Skill</span>
        </div>
      </div>

      {/* API key 状态提示 */}
      {!hasApiKey && (
        <div className="mb-6 p-4 rounded-md border border-wax-red/40 bg-wax-red/5 flex items-center justify-between gap-3">
          <div>
            <p className="font-serif text-sm text-ink-brown mb-0.5">未配置 AI API Key</p>
            <p className="font-sans text-xs text-sepia">
              执行 Skill 需要配置你自己的 Anthropic API key（加密存储，不会泄露）
            </p>
          </div>
          <Link
            href="/settings"
            className="shrink-0 inline-flex items-center h-8 px-4 bg-ink-brown text-vellum font-serif text-sm rounded-sm hover:bg-wax-red transition-colors"
          >
            去配置
          </Link>
        </div>
      )}

      {/* 内容 */}
      {promptSkills.length === 0 ? (
        <div className="border border-paper-edge bg-vellum rounded-md py-16 px-8 text-center">
          <p className="font-serif italic text-leather text-lg mb-2">
            还没有收藏可执行的 Skill
          </p>
          <p className="font-sans text-sm text-sepia mb-6">
            去首页发现有用的 Prompt，点「收藏」就会出现在这里
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
                <h2 className="font-serif text-xl text-ink-brown">
                  {sceneLabelMap.get(scene) || scene}
                </h2>
                <span className="font-mono text-[11px] text-sepia">{items.length}</span>
                <span className="flex-1 h-px bg-paper-edge" />
              </div>
              <ol className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map((p) => (
                  <li key={p.id} className="animate-fade-up">
                    <PostCard post={p} currentUserId={uid} variant="compact" />
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
