import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { cn } from '@/lib/cn';
import { getCurrentUser } from '@/lib/session';
import {
  sceneLabel,
  industryLabel,
  contentLabel,
  skillLabel,
  HOW_TO_USE,
} from '@/lib/tags';
import { formatTime, formatBytes } from '@/lib/format';
import { POST_STATUS } from '@/lib/status';
import { RoleBadge } from '@/components/icons/RoleBadge';
import { SkillIcon } from '@/components/icons/SkillIcon';
import { AttachmentList } from '@/components/AttachmentList';
import { CommentSection } from '@/components/CommentSection';
import { PostActions } from './PostActions';
import { DetailActions } from './DetailActions';
import { SkillPreview } from './SkillPreview';
import { PreCopyButton } from './PreCopyButton';
import { BackLink } from './BackLink';

export default async function PostDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = parseInt(params.id, 10);
  if (Number.isNaN(id)) notFound();

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, nickname: true, role: true, avatarUrl: true } },
      attachments: { orderBy: { createdAt: 'asc' } },
      skillAsset: true,
      _count: { select: { comments: true, likes: true, favorites: true } },
    },
  });
  if (!post || post.status !== POST_STATUS.PUBLISHED) notFound();

  // 仅在初次渲染累加阅读 —— 不要 race
  await prisma.post.update({ where: { id }, data: { viewCount: { increment: 1 } } });

  const me = await getCurrentUser();
  const uid = me?.id ?? null;
  let liked = false;
  let favorited = false;
  if (uid) {
    const [l, f] = await Promise.all([
      prisma.postLike.findUnique({ where: { userId_postId: { userId: uid, postId: id } } }),
      prisma.postFavorite.findUnique({ where: { userId_postId: { userId: uid, postId: id } } }),
    ]);
    liked = !!l;
    favorited = !!f;
  }

  const tagContent: string[] = (() => {
    try {
      return JSON.parse(post.tagContent || '[]');
    } catch {
      return [];
    }
  })();

  const assetType = post.skillAsset?.assetType ?? null;
  const howToUse = assetType ? HOW_TO_USE[assetType] : null;
  const isPrompt = assetType === 'prompt';
  const assetLabel = assetType ? skillLabel(assetType) : '';

  // 附件拆分：首个给顶部主操作，其余给右侧栏
  const primaryAttachment = post.attachments[0]
    ? { id: post.attachments[0].id, fileName: post.attachments[0].fileName }
    : null;
  const restAttachments = post.attachments.slice(1);

  // 摘要（去 HTML 标签）
  const excerpt = post.body.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);

  // 提示词帖：把 body 按 <pre> 拆成「介绍」+「Prompt 块」，
  // Prompt 块单独包 relative 容器，让复制按钮锚定到 <pre> 右上角（而非整篇正文顶部）
  const preSplit = isPrompt ? post.body.split(/(<pre[\s\S]*?<\/pre>)/i) : null;
  const promptIntro = preSplit ? preSplit.filter((s) => !/<pre/i.test(s)).join('') : post.body;
  const promptPre = preSplit ? preSplit.find((s) => /<pre/i.test(s)) ?? '' : '';

  return (
    <article className="mx-auto max-w-page px-4 sm:px-6">
      {/* 返回 */}
      <div className="pt-6 mb-4">
        <BackLink />
      </div>

      {/* —— 标题区（左对齐，紧凑）—— */}
      <header className="mb-5 pb-5 border-b border-paper-edge">
        {/* 小 meta 行：场景·类型 path 点缀 */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 min-w-0">
            {assetType && <SkillIcon skill={assetType} className="h-4 w-4 shrink-0 text-wax-red" />}
            <span className="font-serif text-xs text-ink-brown truncate">
              {assetLabel && <>{assetLabel}<span className="text-sepia">·</span></>}
              {sceneLabel(post.tagScene)}
            </span>
          </div>
          <span className="font-mono text-[10px] text-sepia shrink-0 hidden sm:inline">
            {post.tagScene}/{assetType || '-'}
          </span>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl leading-tight text-ink-brown mb-2">
          {post.title}
        </h1>
        {excerpt && (
          <p className="font-serif italic text-sm text-leather leading-relaxed">
            {excerpt}
          </p>
        )}
      </header>

      {/* —— 顶部主操作区（下载/复制 + 热度）—— */}
      <div className="mb-5">
        <DetailActions
          postId={post.id}
          isAuthed={!!uid}
          primaryAttachment={primaryAttachment}
          isPrompt={isPrompt}
          bodyHtml={post.body}
          viewCount={post.viewCount}
          likes={post._count.likes}
          commentsCount={post._count.comments}
        />
      </div>

      {/* —— 怎么用说明（紧凑内联）—— */}
      {howToUse && (
        <div className="mb-6 rounded-md border border-gilded/40 bg-gilded/5 px-4 py-3 flex gap-2.5 text-sm">
          <span className="shrink-0 mt-0.5 text-gilded" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
              <path d="M8 1.5 a6.5 6.5 0 0 1 0 13 a6.5 6.5 0 0 1 0 -13 Z" />
              <path d="M8 5 V8.5" strokeLinecap="round" />
              <circle cx="8" cy="11" r="0.5" fill="currentColor" />
            </svg>
          </span>
          <div>
            <p className="font-serif text-ink-brown text-[13px] mb-0.5">
              怎么用这个{isPrompt ? '提示词' : assetLabel || '东西'}
            </p>
            <p className="font-sans text-xs text-leather leading-relaxed">{howToUse}</p>
          </div>
        </div>
      )}

      {/* —— 左主右栏 —— */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        {/* 左：正文 */}
        <div className="min-w-0">
          {isPrompt ? (
            // 提示词帖：介绍部分 + Prompt 块分开渲染，
            // 复制按钮锚定到 <pre> 方块的右上角
            <div className="mb-8">
              {promptIntro && (
                <div
                  className="prose-manuscript"
                  dangerouslySetInnerHTML={{ __html: promptIntro }}
                />
              )}
              {promptPre && (
                <div className="relative mt-4">
                  <PreCopyButton bodyHtml={promptPre} postId={post.id} isAuthed={!!uid} />
                  <div
                    className="prose-manuscript font-mono text-sm bg-vellum/40 border border-paper-edge rounded p-4 not-italic [&_pre]:bg-transparent [&_pre]:p-0 [&_pre]:border-0 [&_pre]:whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: promptPre }}
                  />
                </div>
              )}
            </div>
          ) : (
            // 其他类型：正文整体渲染
            <div
              className="prose-manuscript mb-8"
              dangerouslySetInnerHTML={{ __html: post.body }}
            />
          )}

          {/* SKILL.md / md 附件原文预览（默认折叠，平衡小白与技术人） */}
          {post.attachments[0] && (
            <SkillPreview
              storageKey={post.attachments[0].storageKey}
              fileName={post.attachments[0].fileName}
            />
          )}

          {/* 评论区在左栏下方 */}
          <CommentSection
            postId={id}
            postAuthorId={post.author.id}
            assetType={assetType}
            currentUser={me ? { id: me.id, nickname: me.nickname, role: me.role } : null}
          />
        </div>

        {/* 右：sticky 元信息栏 */}
        <aside className="lg:sticky lg:top-6 lg:self-start space-y-5 text-sm">
          {/* 作者（优先显示原作者，否则显示发布者） */}
          {post.skillAsset?.originalAuthor ? (
            <div className="flex items-center gap-2.5">
              <span className="grid place-content-center w-8 h-8 rounded-full bg-parchment border border-paper-edge">
                <RoleBadge role="VC" size={20} />
              </span>
              <div className="min-w-0">
                <p className="font-serif text-base text-ink-brown truncate">
                  {post.skillAsset.originalAuthor}
                </p>
                <p className="font-sans text-[11px] text-sepia">
                  原作者 · 由 {post.author.nickname} 收录
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              {post.author.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.author.avatarUrl}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <RoleBadge role={post.author.role} size={28} />
              )}
              <div className="min-w-0">
                <Link
                  href={`/profile/${post.author.id}`}
                  className="font-serif text-base text-ink-brown hover:text-wax-red transition-colors block truncate"
                >
                  {post.author.nickname}
                </Link>
                <p className="font-sans text-[11px] text-sepia">
                  {post.author.role} · {formatTime(post.createdAt)}
                </p>
              </div>
            </div>
          )}

          <div className="h-px bg-paper-edge" />

          {/* 来源链接 */}
          {post.skillAsset?.sourceUrl && (
            <div>
              <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-1.5">来源</p>
              <a
                href={post.skillAsset.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] text-leather hover:text-wax-red hover:underline break-all"
              >
                {post.skillAsset.sourceUrl}
              </a>
            </div>
          )}

          {/* 标签 */}
          <div>
            <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-1.5">标签</p>
            <div className="flex flex-wrap gap-1.5">
              <Link href={`/?scene=${post.tagScene}`}>
                <TagChip>{sceneLabel(post.tagScene)}</TagChip>
              </Link>
              {post.tagIndustry && (
                <Link href={`/?industry=${post.tagIndustry}`}>
                  <TagChip>{industryLabel(post.tagIndustry)}</TagChip>
                </Link>
              )}
              {tagContent.map((c) => (
                <Link key={c} href={`/?content=${c}`}>
                  <TagChip>{contentLabel(c)}</TagChip>
                </Link>
              ))}
              {post.tagSkill && (
                <Link href={`/?skill=${post.tagSkill}`}>
                  <TagChip highlighted>{skillLabel(post.tagSkill)}</TagChip>
                </Link>
              )}
            </div>
          </div>

          {/* 补充说明（installHint / usageNotes） */}
          {(post.skillAsset?.installHint || post.skillAsset?.usageNotes) && (
            <div>
              <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-1.5">补充说明</p>
              {post.skillAsset.installHint && (
                <p className="font-sans text-xs text-leather leading-relaxed whitespace-pre-wrap mb-2">
                  {post.skillAsset.installHint}
                </p>
              )}
              {post.skillAsset.usageNotes && (
                <p className="font-sans text-xs text-leather leading-relaxed whitespace-pre-wrap">
                  {post.skillAsset.usageNotes}
                </p>
              )}
            </div>
          )}

          {/* 其余附件 */}
          {restAttachments.length > 0 && (
            <div>
              <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-1.5">
                更多文件
              </p>
              <ul className="space-y-1.5">
                {restAttachments.map((a) => (
                  <RestFile key={a.id} attachment={a} />
                ))}
              </ul>
            </div>
          )}

          <div className="h-px bg-paper-edge" />

          {/* 统计 */}
          <div className="font-mono text-[11px] text-sepia space-y-1">
            <div>浏览 <span className="num-osf text-ink-brown">{post.viewCount}</span></div>
            <div>收藏 <span className="num-osf text-ink-brown">{post._count.favorites}</span></div>
          </div>
        </aside>
      </div>

      {/* —— 浮动互动条 —— */}
      <div className="mt-12">
        <PostActions
          postId={id}
          initialLiked={liked}
          initialFavorited={favorited}
          initialLikes={post._count.likes}
          isAuthed={!!uid}
        />
      </div>
    </article>
  );
}

/** 右栏小标签 chip */
function TagChip({
  children,
  highlighted,
}: {
  children: React.ReactNode;
  highlighted?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center h-6 px-2 text-[11px] font-sans rounded-sm border transition-colors',
        highlighted
          ? 'border-gilded bg-gilded/10 text-ink-brown'
          : 'border-paper-edge text-leather',
      )}
    >
      {children}
    </span>
  );
}

/** 右栏其余附件项（带下载） */
function RestFile({
  attachment,
}: {
  attachment: { id: number; fileName: string; fileSize: number };
}) {
  const ext = (attachment.fileName.split('.').pop() ?? '?').toUpperCase();
  return (
    <li className="flex items-center gap-2">
      <span className="font-mono text-[9px] text-sepia bg-parchment border border-paper-edge rounded px-1 py-0.5 shrink-0">
        {ext}
      </span>
      <span className="font-serif text-xs text-ink-brown truncate flex-1" title={attachment.fileName}>
        {attachment.fileName}
      </span>
      <span className="font-mono text-[10px] text-sepia shrink-0">{formatBytes(attachment.fileSize)}</span>
      <a
        href={`/api/files/${attachment.id}/download`}
        download
        className="font-sans text-[11px] text-wax-red hover:underline shrink-0"
      >
        下载
      </a>
    </li>
  );
}
