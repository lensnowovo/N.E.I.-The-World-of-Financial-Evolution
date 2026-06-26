'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { formatCount } from '@/lib/format';
import {
  sceneLabel,
  industryLabel,
  contentLabel,
  skillLabel,
} from '@/lib/tags';
import { RoleBadge } from '@/components/icons/RoleBadge';
import { SkillIcon } from '@/components/icons/SkillIcon';
import {
  SceneChip,
  IndustryChip,
  ContentChip,
  SkillChip,
} from '@/components/ui/Chip';
import { TimeText } from '@/components/TimeText';
import type { PostCardData } from '@/lib/types';

// PostCardData 定义已抽到 lib/types.ts，这里 re-export 保持向后兼容
export type { PostCardData } from '@/lib/types';

/**
 * PostCard · 卷宗条目
 * vellum 底、paper-edge 描边、hover 转 sepia、无阴影
 * 不要 transform、不要 emoji
 *
 * variant:
 * - 'default'：宽列布局（/search、/profile 用，向后兼容）
 * - 'compact'：紧凑卡片（首页 grid 用，纵向、信息密集）
 */
export function PostCard({
  post,
  currentUserId,
  variant = 'default',
}: {
  post: PostCardData;
  currentUserId: number | null;
  variant?: 'default' | 'compact';
}) {
  if (variant === 'compact') {
    return <SkillFeedPostCard post={post} currentUserId={currentUserId} />;
  }
  return <DefaultPostCard post={post} currentUserId={currentUserId} />;
}

function DefaultPostCard({
  post,
  currentUserId,
}: {
  post: PostCardData;
  currentUserId: number | null;
}) {
  const router = useRouter();
  const [starred, setStarred] = useState(post.starred);
  const [stars, setStars] = useState(post.counts.stars);

  const requireAuth = () => {
    if (!currentUserId) {
      router.push(`/login?next=/posts/${post.id}`);
      return false;
    }
    return true;
  };

  const toggleStar = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!requireAuth()) return;
    const next = !starred;
    setStarred(next);
    setStars((n) => n + (next ? 1 : -1));
    const res = await fetch(`/api/posts/${post.id}/favorite`, { method: 'POST' });
    if (!res.ok) {
      setStarred(!next);
      setStars((n) => n + (next ? -1 : 1));
    }
  };

  return (
    <article className="group relative">
      <Link href={`/posts/${post.id}`} className="block">
        <div
          className={cn(
            'relative border border-paper-edge bg-vellum rounded-md',
            'transition-colors duration-150',
            'group-hover:border-sepia',
            'p-6 sm:p-7',
          )}
        >
          {/* —— Skill 类型徽标 —— */}
          {post.skillAsset && (
            <div className="mb-2 flex items-center gap-1.5">
              <SkillIcon skill={post.skillAsset.assetType} className="h-4 w-4 text-wax-red" />
              <span className="text-xs font-semibold text-wax-red">{skillLabel(post.skillAsset.assetType)}</span>
            </div>
          )}

          {/* —— 作者条：优先显示原作者（如 Anthropic/肖璟），无则显示上传者 —— */}
          <div className="flex items-center gap-2 mb-3 font-sans text-xs text-sepia">
            <RoleBadge role={post.author.role} size={16} />
            <span className="text-ink-brown">{post.skillAsset?.originalAuthor || post.author.nickname}</span>
            <DotSep />
            <TimeText value={post.createdAt} />
            {post.counts.attachments > 0 && (
              <>
                <DotSep />
                <span className="inline-flex items-center gap-1">
                  <PaperclipIcon />
                  附 {post.counts.attachments}
                </span>
              </>
            )}
          </div>

          {/* —— 标题 —— */}
          <h2 className="font-serif text-[22px] leading-snug text-ink-brown mb-2.5 group-hover:text-wax-red transition-colors">
            {post.title}
          </h2>

          {/* —— 摘要 —— */}
          <p
            className="font-sans text-sm text-leather leading-relaxed mb-5"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {post.excerpt}
          </p>

          {/* —— 四维标签 —— */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <SceneChip>{sceneLabel(post.tagScene)}</SceneChip>
            {post.tagIndustry && (
              <IndustryChip>{industryLabel(post.tagIndustry)}</IndustryChip>
            )}
            {post.tagContent.slice(0, 2).map((c) => (
              <ContentChip key={c}>{contentLabel(c)}</ContentChip>
            ))}
            {post.tagContent.length > 2 && (
              <span className="font-sans text-[11px] text-sepia">
                +{post.tagContent.length - 2}
              </span>
            )}
            {post.tagSkill && (
              <SkillChip skillKey={post.tagSkill}>
                {skillLabel(post.tagSkill)}
              </SkillChip>
            )}
          </div>

          {/* —— 互动条 —— */}
          <div className="pt-4 border-t border-paper-edge flex items-center gap-5 font-sans text-xs">
            <CardAction
              onClick={toggleStar}
              active={starred}
              icon={<StarIcon filled={starred} />}
            >
              {formatCount(stars)}
            </CardAction>
            <CardAction icon={<CommentIcon />}>
              {formatCount(post.counts.comments)}
            </CardAction>
          </div>
        </div>
      </Link>
    </article>
  );
}

/* ============================================================
   CompactPostCard · 紧凑卡片（首页 grid 用，纵向、信息密集）
   ============================================================ */
function SkillFeedPostCard({
  post,
  currentUserId,
}: {
  post: PostCardData;
  currentUserId: number | null;
}) {
  const router = useRouter();
  const [starred, setStarred] = useState(post.starred);
  const [stars, setStars] = useState(post.counts.stars);
  const assetType = post.assetType ?? post.skillAsset?.assetType ?? post.tagSkill ?? '';
  const pathToken = `${post.tagScene}/${assetType || '-'}`;
  const displayAuthor = post.skillAsset?.originalAuthor || post.author.nickname;

  const toggleStar = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUserId) {
      router.push(`/login?next=/posts/${post.id}`);
      return;
    }
    const next = !starred;
    setStarred(next);
    setStars((n) => n + (next ? 1 : -1));
    const res = await fetch(`/api/posts/${post.id}/favorite`, { method: 'POST' });
    if (!res.ok) {
      setStarred(!next);
      setStars((n) => n + (next ? -1 : 1));
    }
  };

  return (
    <article className="group relative break-inside-avoid">
      <div className="overflow-hidden rounded-md border border-paper-edge bg-vellum transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-sepia group-hover:shadow-card">
        <header className="flex items-start justify-between gap-3 border-b border-paper-edge bg-parchment/35 px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="mb-1 flex items-center gap-1.5 font-serif text-xs text-sepia">
              <SkillIcon skill={assetType} className="h-3.5 w-3.5 shrink-0 text-wax-red" />
              <span className="truncate">{assetType ? skillLabel(assetType) : '内容'} · {sceneLabel(post.tagScene)}</span>
            </p>
            <h2 className="font-serif text-[17px] leading-snug text-ink-brown transition-colors group-hover:text-wax-red">
              <Link href={`/posts/${post.id}`}>{post.title}</Link>
            </h2>
          </div>
          <button
            type="button"
            onClick={toggleStar}
            className={cn(
              'inline-flex items-center gap-1 shrink-0 pt-0.5 font-mono text-[11px] transition-colors',
              starred ? 'text-gilded' : 'text-sepia hover:text-ink-brown',
            )}
            title="收藏"
          >
            <StarIcon filled={starred} />
            {formatCount(stars)}
          </button>
        </header>

        <div className="px-3.5 py-3">
          <div className="mb-2.5 flex items-center gap-1.5 min-w-0 font-sans text-[12px] text-sepia">
            <RoleBadge role={post.author.role} size={16} />
            <span className="truncate text-ink-brown">{displayAuthor}</span>
            {post.tagIndustry && (
              <>
                <span className="shrink-0 text-sepia/60">·</span>
                <span className="truncate">{industryLabel(post.tagIndustry)}</span>
              </>
            )}
          </div>

          <p className="font-sans text-sm leading-relaxed text-leather">
            {post.excerpt}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {post.mcpApproved && <SignalBadge tone="mcp">MCP Ready</SignalBadge>}
            {post.featured && <SignalBadge tone="featured">精选</SignalBadge>}
            {post.counts.attachments > 0 && <SignalBadge tone="file">附件 {post.counts.attachments}</SignalBadge>}
            {post.tagContent.slice(0, 2).map((content) => (
              <InlineTag key={content}>{contentLabel(content)}</InlineTag>
            ))}
          </div>
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-paper-edge bg-parchment/20 px-3.5 py-2 font-sans text-xs text-sepia">
          <div className="flex min-w-0 items-center gap-2">
            <TimeText value={post.createdAt} className="shrink-0" />
            <span className="inline-flex items-center gap-1" title="浏览">
              <EyeIcon />
              {formatCount(post.viewCount)}
            </span>
            <span className="inline-flex items-center gap-1" title="评论">
              <CommentIcon />
              {formatCount(post.counts.comments)}
            </span>
          </div>
          <Link href={`/posts/${post.id}`} className="shrink-0 font-serif italic text-leather transition-colors hover:text-wax-red">
            详情 →
          </Link>
        </footer>
      </div>
    </article>
  );
}

function CompactPostCard({
  post,
  currentUserId,
}: {
  post: PostCardData;
  currentUserId: number | null;
}) {
  const router = useRouter();
  const [starred, setStarred] = useState(post.starred);
  const [stars, setStars] = useState(post.counts.stars);
  const [previewOpen, setPreviewOpen] = useState(false);

  const toggleStar = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUserId) {
      router.push(`/login?next=/posts/${post.id}`);
      return;
    }
    const next = !starred;
    setStarred(next);
    setStars((n: number) => n + (next ? 1 : -1));
    const res = await fetch(`/api/posts/${post.id}/favorite`, { method: 'POST' });
    if (!res.ok) {
      setStarred(!next);
      setStars((n: number) => n + (next ? -1 : 1));
    }
  };

  // path 点缀 token：场景 value + / + 资产类型 value（如 screening/prompt）
  const assetType = post.assetType ?? post.skillAsset?.assetType ?? post.tagSkill ?? '';
  const pathToken = `${post.tagScene}/${assetType || '-'}`;

  return (
    <article className="group relative h-full">
      <div
        className={cn(
          'relative flex flex-col h-full border border-paper-edge bg-vellum rounded-md',
          'transition-all duration-200 group-hover:border-sepia group-hover:-translate-y-0.5 group-hover:shadow-card',
          'p-3 sm:p-4',
        )}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <SkillIcon skill={assetType} className="h-3.5 w-3.5 shrink-0 text-wax-red" />
            <span className="font-serif text-xs text-ink-brown truncate">
              {assetType ? skillLabel(assetType) : '内容'}
              <span className="text-sepia"> · </span>
              {sceneLabel(post.tagScene)}
            </span>
          </div>
          <span className="font-mono text-[10px] text-sepia shrink-0 hidden sm:inline">{pathToken}</span>
        </div>

        <div className="mb-2 flex flex-wrap items-center gap-1">
          {post.mcpApproved && <SignalBadge tone="mcp">MCP Ready</SignalBadge>}
          {post.featured && <SignalBadge tone="featured">精选</SignalBadge>}
          {post.counts.attachments > 0 && <SignalBadge tone="file">附件 {post.counts.attachments}</SignalBadge>}
        </div>

        <h2 className="font-serif text-base leading-snug text-ink-brown mb-1.5 group-hover:text-wax-red transition-colors">
          <Link
            href={`/posts/${post.id}`}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {post.title}
          </Link>
        </h2>

        <p
          className="font-sans text-xs text-leather leading-relaxed mb-3"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {post.excerpt}
        </p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <JudgmentBlock title="输入" body={post.inputExample} />
          <JudgmentBlock title="输出" body={post.outputExample} />
        </div>

        {previewOpen && (
          <div className="mb-3 border border-paper-edge bg-parchment/60 px-3 py-2.5">
            <p className="font-display tracking-display text-[10px] uppercase text-sepia mb-1">使用边界</p>
            <p className="font-sans text-[11px] leading-5 text-leather">{post.usageBoundary}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {post.tagIndustry && <InlineTag>{industryLabel(post.tagIndustry)}</InlineTag>}
              {post.tagContent.slice(0, 2).map((content) => (
                <InlineTag key={content}>{contentLabel(content)}</InlineTag>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto pt-2 border-t border-paper-edge">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 font-sans text-[11px]">
              <RoleBadge role={post.author.role} size={14} />
              <span className="text-ink-brown truncate">{post.skillAsset?.originalAuthor || post.author.nickname}</span>
              <span className="text-sepia/60 shrink-0">·</span>
              <TimeText value={post.createdAt} className="text-sepia shrink-0" />
            </div>
            <span className="inline-flex items-center gap-0.5 font-mono text-[10px] text-sepia" title="浏览">
              <EyeIcon />
              {formatCount(post.viewCount)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 font-sans text-xs">
            <div className="flex items-center gap-2.5 text-sepia">
              <button
                type="button"
                onClick={toggleStar}
                className={cn('inline-flex items-center gap-1 transition-colors', starred ? 'text-gilded' : 'hover:text-ink-brown')}
                title="收藏"
              >
                <StarIcon filled={starred} />
                {formatCount(stars)}
              </button>
              <span className="inline-flex items-center gap-1" title="评论">
                <CommentIcon />
                {formatCount(post.counts.comments)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPreviewOpen((value) => !value)}
                className="font-serif italic text-sepia hover:text-ink-brown transition-colors"
              >
                {previewOpen ? '收起' : '预览'}
              </button>
              <Link href={`/posts/${post.id}`} className="font-serif italic text-leather hover:text-wax-red transition-colors">
                详情 →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function SignalBadge({ tone, children }: { tone: 'mcp' | 'featured' | 'file'; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center h-5 px-1.5 border font-sans text-[10px]',
        tone === 'mcp' && 'border-moss/50 text-moss bg-moss/5',
        tone === 'featured' && 'border-ink-brown text-ink-brown bg-parchment',
        tone === 'file' && 'border-gilded/50 text-gilded bg-gilded/5',
      )}
    >
      {children}
    </span>
  );
}

function JudgmentBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-paper-edge bg-parchment/45 px-2.5 py-2">
      <p className="font-display tracking-display text-[9px] uppercase text-sepia mb-1">{title}</p>
      <p
        className="font-sans text-[11px] leading-5 text-leather"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {body}
      </p>
    </div>
  );
}

function InlineTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="border border-paper-edge bg-vellum px-1.5 py-0.5 font-sans text-[10px] text-sepia">
      {children}
    </span>
  );
}

function EyeIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true">
      <path d="M1.5 8 C3 5, 5.5 3.5, 8 3.5 C10.5 3.5, 13 5, 14.5 8 C13 11, 10.5 12.5, 8 12.5 C5.5 12.5, 3 11, 1.5 8 Z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

/* ============================================================
   局部小组件
   ============================================================ */
function DotSep() {
  return <span className="text-sepia/60">·</span>;
}

function CardAction({
  onClick,
  active,
  icon,
  children,
}: {
  onClick?: (e: React.MouseEvent) => void;
  active?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const interactive = !!onClick;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 transition-colors',
        active ? 'text-wax-red' : 'text-sepia',
        interactive && 'hover:text-ink-brown cursor-pointer',
        !interactive && 'cursor-default',
      )}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

/* —— 极简线性图标 —— */
function StarIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M8 1.5 L10.2 5.5 L14.5 6.3 L11.5 9.5 L12.2 14 L8 11.8 L3.8 14 L4.5 9.5 L1.5 6.3 L5.8 5.5 Z" strokeLinejoin="round" />
    </svg>
  );
}
function CommentIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M2.5 4 H13.5 V11 H8.5 L5.5 13.5 V11 H2.5 Z" strokeLinejoin="round" />
    </svg>
  );
}
function PaperclipIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true">
      <path d="M11 4 L5.5 9.5 C4.5 10.5, 4.5 12, 5.5 13 C6.5 14, 8 14, 9 13 L13 9 C14.5 7.5, 14.5 5, 13 3.5 C11.5 2, 9 2, 7.5 3.5 L3.5 7.5" strokeLinecap="round" />
    </svg>
  );
}
