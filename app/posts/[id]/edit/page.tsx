import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { canEditPost } from '@/lib/post-auth';
import { POST_STATUS } from '@/lib/status';
import { EditForm } from './EditForm';

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) notFound();

  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      body: true,
      tagScene: true,
      tagIndustry: true,
      tagContent: true,
      tagSkill: true,
      status: true,
      deletedAt: true,
      userId: true,
    },
  });
  // 软删 / 不存在 → 404/gone（复用 posts/[id]/not-found.tsx）
  if (!post || post.deletedAt) notFound();

  const me = await getCurrentUser();
  if (!me) {
    redirect(`/login?next=/posts/${id}/edit`);
  }
  if (!canEditPost(me.id, { userId: post.userId }, me.isAdmin)) {
    redirect(`/posts/${id}`);
  }

  let tagContent: string[] = [];
  try {
    const parsed = JSON.parse(post.tagContent || '[]');
    if (Array.isArray(parsed)) tagContent = parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    tagContent = [];
  }

  return (
    <article className="mx-auto max-w-page px-4 sm:px-6">
      <div className="pt-6 mb-4">
        <a
          href={`/posts/${id}`}
          className="font-serif italic text-xs text-sepia hover:text-ink-brown transition-colors"
        >
          ← 返回详情
        </a>
      </div>

      <header className="mb-6 pb-5 border-b border-paper-edge">
        <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-2">
          编辑
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl leading-tight text-ink-brown">
          修改这篇内容
        </h1>
        <p className="font-serif italic text-sm text-leather mt-2">
          只改你写的那部分，别把好内容弄丢了
        </p>
      </header>

      <EditForm
        postId={post.id}
        initialTitle={post.title}
        initialBody={post.body}
        initialTagScene={post.tagScene}
        initialTagIndustry={post.tagIndustry}
        initialTagContent={tagContent}
        initialTagSkill={post.tagSkill}
        // status 仅用于决定是否提示「这是草稿」；PATCH 不改 status
        isDraft={post.status !== POST_STATUS.PUBLISHED}
      />
    </article>
  );
}
