import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { cn } from '@/lib/cn';
import { getCurrentUser } from '@/lib/session';
import { canEditPost } from '@/lib/post-auth';
import {
  sceneLabel,
  industryLabel,
  contentLabel,
  skillLabel,
  HOW_TO_USE,
} from '@/lib/tags';
import { formatTime, formatBytes } from '@/lib/format';
import { sanitizeHtml } from '@/lib/validate';
import { POST_STATUS } from '@/lib/status';
import { RoleBadge } from '@/components/icons/RoleBadge';
import { SkillIcon } from '@/components/icons/SkillIcon';
import { AttachmentList } from '@/components/AttachmentList';
import { CommentSection } from '@/components/CommentSection';
import { PostActions, PostStarButton } from './PostActions';
import { DetailActions } from './DetailActions';
import { SkillPreview } from './SkillPreview';
import { PreCopyButton } from './PreCopyButton';
import { BackLink } from './BackLink';
import { ExecuteButton } from './ExecuteButton';
import { ReportButton } from './ReportButton';
import { DeleteButton } from './DeleteButton';
import { analyzeSkillQuality } from '@/lib/skill-quality';
import { buildSkillDisplay } from '@/lib/skill-display';
import { SkillQualityPanel } from '@/components/SkillQualityPanel';
import { getPublicBaseUrl, normalizePublicText, normalizePublicUrl } from '@/lib/public-url';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) return {};

  const post = await prisma.post.findFirst({
    where: { id, status: POST_STATUS.PUBLISHED },
    select: {
      id: true,
      title: true,
      body: true,
      tagScene: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { nickname: true } },
      skillAsset: { select: { assetType: true } },
    },
  });
  if (!post) return {};

  const baseUrl = getPublicBaseUrl();
  const description =
    cleanExcerpt(normalizePublicText(sanitizeHtml(post.body)), 110) ||
    '面向一级市场投资人的 Skill、Prompt、模板和工作流。';
  const assetType = post.skillAsset?.assetType ? skillLabel(post.skillAsset.assetType) : 'Skill';
  const title = `${post.title} · ${assetType}`;
  const imageUrl = `${baseUrl}/api/og/post/${post.id}`;

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/posts/${post.id}`,
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/posts/${post.id}`,
      type: 'article',
      siteName: 'N.E.I.',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      publishedTime: post.createdAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [post.author.nickname],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) notFound();

  // 并行取 post 与当前用户——省一轮串行 DB 往返（详情页慢的主因之一是串行查询 + Neon 冷启动）
  const [post, me] = await Promise.all([
    prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, nickname: true, role: true, avatarUrl: true } },
        attachments: { orderBy: { createdAt: 'asc' } },
        skillAsset: true,
        _count: { select: { comments: true, stars: true } },
      },
    }),
    getCurrentUser(),
  ]);
  if (!post || post.status !== POST_STATUS.PUBLISHED || post.deletedAt) notFound();

  const uid = me?.id ?? null;
  // 作者本人或管理员可编辑（US-013）
  const canEdit = me ? canEditPost(me.id, { userId: post.author.id }, me.isAdmin) : false;

  // viewCount 自增是 non-critical 写：fire-and-forget，不阻塞渲染。
  // serverless 函数返回后该 promise 可能被回收，最多少计一次浏览，可接受。
  void incrementViewCount(id).catch(() => {});

  let starred = false;
  let hasApiKey = false;
  if (uid) {
    const [starRow, apiKeyConfigured] = await Promise.all([
      prisma.postFavorite.findUnique({ where: { userId_postId: { userId: uid, postId: id } } }),
      getHasApiKey(uid),
    ]);
    starred = !!starRow;
    hasApiKey = apiKeyConfigured;
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
  const isDiscipline = assetType === 'agent-discipline';
  const assetLabel = assetType ? skillLabel(assetType) : '';

  // 附件拆分：首个给顶部主操作，其余给右侧栏
  const primaryAttachment = post.attachments[0]
    ? { id: post.attachments[0].id, fileName: post.attachments[0].fileName }
    : null;
  const restAttachments = post.attachments.slice(1);

  // Defense-in-depth: 渲染前再清洗一次 body，覆盖 DB 中可能存在的未清洗 legacy 内容。
  // 所有走 dangerouslySetInnerHTML 的路径（excerpt/promptParts/正文）都基于此值。
  const safeBody = normalizePublicText(sanitizeHtml(post.body));
  const quality = analyzeSkillQuality({
    title: post.title,
    body: safeBody,
    tagScene: post.tagScene,
    tagContent,
    tagSkill: post.tagSkill,
    assetType,
    attachmentsCount: post.attachments.length,
    sourceUrl: post.skillAsset?.sourceUrl ?? null,
    installHint: post.skillAsset?.installHint ?? null,
    usageNotes: post.skillAsset?.usageNotes ?? null,
  });
  const display = buildSkillDisplay({
    title: post.title,
    body: safeBody,
    tagScene: post.tagScene,
    tagIndustry: post.tagIndustry,
    tagContent,
    tagSkill: post.tagSkill,
    assetType,
    outputExample: quality.outputExample,
  });

  // 摘要（去 HTML 标签）
  const excerpt = display.displaySummary || cleanExcerpt(safeBody, 120);
  const baseUrl = getPublicBaseUrl();
  const keywordLabels = [
    sceneLabel(post.tagScene),
    post.tagIndustry ? industryLabel(post.tagIndustry) : null,
    ...tagContent.map((tag) => contentLabel(tag)),
    assetType ? skillLabel(assetType) : null,
  ].filter((item): item is string => Boolean(item));
  const postJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': `${baseUrl}/posts/${post.id}#skill`,
    name: post.title,
    headline: post.title,
    description: excerpt,
    url: `${baseUrl}/posts/${post.id}`,
    inLanguage: 'zh-CN',
    datePublished: post.createdAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: {
      '@type': post.skillAsset?.originalAuthor ? 'Organization' : 'Person',
      name: post.skillAsset?.originalAuthor || post.author.nickname,
    },
    publisher: {
      '@type': 'Organization',
      name: 'N.E.I.',
      url: baseUrl,
    },
    learningResourceType: assetLabel || 'Skill',
    keywords: keywordLabels.join(', '),
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/ViewAction',
        userInteractionCount: post.viewCount,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: post._count.stars,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/CommentAction',
        userInteractionCount: post._count.comments,
      },
    ],
  };

  // 提示词帖：把 body 按 <pre> 拆成「介绍」+「Prompt 块」（可能有多个）
  // 每个 Prompt 块单独配复制按钮
  const preSplit = isPrompt ? safeBody.split(/(<pre[\s\S]*?<\/pre>)/i) : null;
  const promptParts = preSplit
    ? preSplit.filter((s) => s.trim()).map((s) => ({
        isPre: /<pre/i.test(s),
        html: s,
      }))
    : [];

  return (
    <article className="mx-auto max-w-page px-4 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postJsonLd) }}
      />
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
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono text-[10px] text-sepia hidden sm:inline">
              {post.tagScene}/{assetType || '-'}
            </span>
            {canEdit && (
              <Link
                href={`/posts/${id}/edit`}
                className="inline-flex items-center gap-1 font-serif italic text-xs text-leather hover:text-wax-red transition-colors"
                title={me?.isAdmin && me.id !== post.author.id ? '管理员编辑' : '编辑这篇内容'}
              >
                <EditIcon />
                编辑
              </Link>
            )}
            {canEdit && <DeleteButton postId={post.id} isAdmin={me?.isAdmin && me.id !== post.author.id} />}
            {uid && <ReportButton postId={post.id} />}
          </div>
        </div>

        <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="font-serif text-3xl sm:text-4xl leading-tight text-ink-brown">
            {post.title}
          </h1>
          <div className="shrink-0 sm:pt-1">
            <PostStarButton
              postId={id}
              initialStarred={starred}
              initialStars={post._count.stars}
              isAuthed={!!uid}
              variant="title"
            />
          </div>
        </div>
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
          bodyHtml={safeBody}
          viewCount={post.viewCount}
          stars={post._count.stars}
          commentsCount={post._count.comments}
          shareTitle={post.title}
          shareDescription={excerpt}
          shareUrl={`${baseUrl}/posts/${post.id}`}
          shareScene={sceneLabel(post.tagScene)}
          shareAssetLabel={assetLabel || 'Skill'}
        />
        {/* 执行按钮（仅 prompt 类型） */}
        {isPrompt && (
          <div className="mt-3">
            <ExecuteButton postId={post.id} isAuthed={!!uid} hasApiKey={hasApiKey} />
          </div>
        )}
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
              使用说明
            </p>
            <p className="font-sans text-xs text-leather leading-relaxed">{howToUse}</p>
          </div>
        </div>
      )}

      {isDiscipline && (
        <div className="mb-6 rounded-md border-2 border-gilded/40 bg-parchment px-4 py-4">
          <p className="font-display tracking-display text-[10px] uppercase text-sepia mb-1">
            Agent Context
          </p>
          <h2 className="font-serif text-xl text-ink-brown mb-1">工作纪律不是普通 Prompt</h2>
          <p className="font-sans text-sm leading-7 text-leather">
            建议在执行 BP 初筛、行研、尽调、建模、IC Memo 或 LP 汇报等任务前，先通过 MCP 加载这张纪律卡。
            它用于约束 Agent 不编造数据、不伪造来源、不把推断写成事实，并提示人工复核边界。
          </p>
          <p className="mt-2 font-sans text-xs text-sepia">
            MCP 工具：<code className="font-mono">get_default_discipline</code>
          </p>
        </div>
      )}

      <SkillUseSummary
        scene={sceneLabel(post.tagScene)}
        assetLabel={assetLabel || 'Skill'}
        mcpApproved={post.mcpApproved}
        securityLevel={post.securityLevel}
        version={post.version}
        displayUseCase={display.displayUseCase}
        displayOutput={display.displayOutput}
        bestFor={quality.bestFor}
        inputExample={quality.inputExample}
        outputExample={quality.outputExample}
        boundary={getUsageBoundary({
          assetType,
          securityLevel: post.securityLevel,
          mcpApproved: post.mcpApproved,
        })}
      />

      {/* —— 左主右栏 —— */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        {/* 左：正文 */}
        <div className="min-w-0">
          {isPrompt ? (
            // 提示词帖：按 <pre> 块拆分渲染，每个 pre 配复制按钮
            <div className="mb-8 prose-manuscript">
              {promptParts.map((part, i) =>
                part.isPre ? (
                  <div key={i} className="relative mt-4 not-italic">
                    <PreCopyButton bodyHtml={part.html} postId={post.id} isAuthed={!!uid} />
                    <div
                      className="font-mono text-sm text-ink-brown bg-vellum/40 border border-paper-edge rounded p-4 [&_pre]:bg-transparent [&_pre]:p-0 [&_pre]:border-0 [&_pre]:text-ink-brown [&_pre]:whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: part.html }}
                    />
                  </div>
                ) : (
                  <div
                    key={i}
                    dangerouslySetInnerHTML={{ __html: part.html }}
                  />
                ),
              )}
            </div>
          ) : (
            // 其他类型：正文整体渲染
            <div
              className="prose-manuscript mb-8"
              dangerouslySetInnerHTML={{ __html: safeBody }}
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
                href={normalizePublicUrl(post.skillAsset.sourceUrl) ?? post.skillAsset.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] text-leather hover:text-wax-red hover:underline break-all"
              >
                {normalizePublicUrl(post.skillAsset.sourceUrl) ?? post.skillAsset.sourceUrl}
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
                  {normalizePublicText(post.skillAsset.installHint)}
                </p>
              )}
              {post.skillAsset.usageNotes && (
                <p className="font-sans text-xs text-leather leading-relaxed whitespace-pre-wrap">
                  {normalizePublicText(post.skillAsset.usageNotes)}
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
            <div>收藏 <span className="num-osf text-ink-brown">{post._count.stars}</span></div>
          </div>
        </aside>
      </div>

      <section className="mt-10 border-t border-paper-edge pt-8">
        <div className="mb-4">
          <p className="font-display tracking-display text-[10px] uppercase text-sepia mb-1">
            Quality & Source
          </p>
          <h2 className="font-serif text-2xl text-ink-brown">质量与来源</h2>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <SkillQualityPanel quality={quality} />
          <div className="rounded-md border border-paper-edge bg-vellum/55 p-4">
            <p className="font-display tracking-display text-[10px] uppercase text-sepia mb-2">
              外显信息
            </p>
            <dl className="space-y-3 font-sans text-xs text-leather">
              <div>
                <dt className="text-sepia">一句话简介</dt>
                <dd className="mt-1 leading-5">{display.displaySummary}</dd>
              </div>
              <div>
                <dt className="text-sepia">适用场景</dt>
                <dd className="mt-1 leading-5">{display.displayUseCase}</dd>
              </div>
              <div>
                <dt className="text-sepia">输出结果</dt>
                <dd className="mt-1 leading-5">{display.displayOutput}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* —— 浮动互动条 —— */}
      <div className="mt-12">
        <PostActions
          postId={id}
          initialStarred={starred}
          initialStars={post._count.stars}
          isAuthed={!!uid}
        />
      </div>

      {/* 免责声明 */}
      <div className="mt-10 pt-5 border-t border-paper-edge">
        <p className="font-sans text-[11px] text-sepia leading-relaxed">
          本 Skill 仅用于辅助分析和内容生成，不构成投资建议、法律意见、财务意见、税务意见、审计意见或合规意见。请结合实际情况和专业判断使用。详见{' '}
          <Link href="/disclaimer" className="text-leather hover:text-ink-brown underline">免责声明</Link>。
        </p>
      </div>
    </article>
  );
}

function cleanExcerpt(html: string, maxLength: number) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function SkillUseSummary({
  scene,
  assetLabel,
  mcpApproved,
  securityLevel,
  version,
  displayUseCase,
  displayOutput,
  bestFor,
  inputExample,
  outputExample,
  boundary,
}: {
  scene: string;
  assetLabel: string;
  mcpApproved: boolean;
  securityLevel: string;
  version: number;
  displayUseCase: string;
  displayOutput: string;
  bestFor: string[];
  inputExample: string;
  outputExample: string;
  boundary: string;
}) {
  const statusLabel = mcpApproved ? 'MCP Ready' : '网站可用';
  const statusTone = mcpApproved
    ? 'border-moss/40 bg-moss/5 text-moss'
    : 'border-paper-edge bg-vellum text-sepia';
  const securityLabel = securityLevel === 'safe' ? '安全通过' : securityLevel === 'suspicious' ? '待复核' : '不建议调用';
  const useCaseBody = displayUseCase || [scene, assetLabel, ...bestFor.slice(1, 3)].filter(Boolean).join(' / ');
  const outputBody = displayOutput || outputExample;

  return (
    <section className="mb-8 rounded-md border border-paper-edge bg-vellum/55 px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display tracking-display text-[10px] uppercase text-sepia mb-1">
            Usage Brief
          </p>
          <h2 className="font-serif text-xl text-ink-brown">使用摘要</h2>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className={cn('inline-flex h-7 items-center rounded-sm border px-2.5 font-sans text-[11px]', statusTone)}>
            {statusLabel}
          </span>
          <span className="inline-flex h-7 items-center rounded-sm border border-paper-edge bg-parchment px-2.5 font-sans text-[11px] text-leather">
            v{version}
          </span>
          <span className="inline-flex h-7 items-center rounded-sm border border-paper-edge bg-parchment px-2.5 font-sans text-[11px] text-leather">
            {securityLabel}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <SummaryBlock title="适用场景" body={useCaseBody} />
        <SummaryBlock title="输入材料" body={inputExample} />
        <SummaryBlock title="输出结果" body={outputBody} />
        <SummaryBlock title="使用边界" body={boundary} />
      </div>
    </section>
  );
}

function SummaryBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-t border-paper-edge pt-3">
      <p className="font-display tracking-display text-[10px] uppercase text-sepia mb-1">{title}</p>
      <p className="font-sans text-xs leading-5 text-leather">{body}</p>
    </div>
  );
}

function getUsageBoundary({
  assetType,
  securityLevel,
  mcpApproved,
}: {
  assetType: string | null;
  securityLevel: string;
  mcpApproved: boolean;
}) {
  if (securityLevel !== 'safe') return '该内容仍需复核，建议先在非敏感材料中试用。';
  if (!mcpApproved) return '可在网页阅读、复制或下载；进入 MCP 前仍需审核确认。';
  if (assetType === 'api-script') return '运行脚本前请在隔离环境检查代码、依赖和环境变量。';
  if (assetType === 'template') return '模板适合脱敏后复用，正式材料仍需人工校对。';
  if (assetType === 'agent-discipline') return '作为 Agent 第一层上下文加载，用于约束后续 Skill / Workflow 的执行方式。';
  return '适合处理已脱敏或可公开讨论的工作材料；最终判断仍由使用者负责。';
}

async function incrementViewCount(postId: number): Promise<void> {
  try {
    await prisma.post.update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } },
    });
  } catch (error) {
    console.error(`Failed to increment view count for post ${postId}`, error);
  }
}

async function getHasApiKey(userId: number): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { apiKeyEnc: true },
    });
    return !!user?.apiKeyEnc;
  } catch (error) {
    // This field was introduced after the initial production schema. Keep the
    // detail page usable while a deployment is applying the additive change.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2022') {
      console.error('User.apiKeyEnc is missing from the database; run prisma db push.');
      return false;
    }
    throw error;
  }
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

/** 编辑入口的铅笔图标 */
function EditIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 2 L14 5 L5 14 L1.5 14.5 L2 11 Z" />
      <path d="M9.5 3.5 L12.5 6.5" />
    </svg>
  );
}
