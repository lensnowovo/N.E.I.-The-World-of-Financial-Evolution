'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { formatCount } from '@/lib/format';
import { contentLabel, industryLabel, sceneLabel, skillLabel } from '@/lib/tags';
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

export type { PostCardData } from '@/lib/types';

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
    <article className="group relative">
      <Link href={`/posts/${post.id}`} className="block">
        <div
          className={cn(
            'relative border border-paper-edge bg-vellum rounded-md',
            'transition-colors duration-150 group-hover:border-sepia',
            'p-6 sm:p-7',
          )}
        >
          {post.skillAsset && (
            <div className="mb-2 flex items-center gap-1.5">
              <SkillIcon skill={post.skillAsset.assetType} className="h-4 w-4 text-wax-red" />
              <span className="text-xs font-semibold text-wax-red">
                {skillLabel(post.skillAsset.assetType)}
              </span>
            </div>
          )}

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
                  附件 {post.counts.attachments}
                </span>
              </>
            )}
          </div>

          <h2 className="font-serif text-[22px] leading-snug text-ink-brown mb-2.5 group-hover:text-wax-red transition-colors">
            <span title={post.title}>{post.displayTitle || post.title}</span>
          </h2>

          <p className="font-sans text-sm text-leather leading-relaxed mb-5 line-clamp-2">
            {post.displaySummary || post.excerpt}
          </p>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <SceneChip>{sceneLabel(post.tagScene)}</SceneChip>
            {post.tagIndustry && <IndustryChip>{industryLabel(post.tagIndustry)}</IndustryChip>}
            {post.tagContent.slice(0, 2).map((c) => (
              <ContentChip key={c}>{contentLabel(c)}</ContentChip>
            ))}
            {post.tagContent.length > 2 && (
              <span className="font-sans text-[11px] text-sepia">
                +{post.tagContent.length - 2}
              </span>
            )}
            {post.tagSkill && <SkillChip skillKey={post.tagSkill}>{skillLabel(post.tagSkill)}</SkillChip>}
          </div>

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
  const [copied, setCopied] = useState(false);
  const assetType = post.assetType ?? post.skillAsset?.assetType ?? post.tagSkill ?? '';

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

  const copyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <article className="group relative break-inside-avoid">
      <Link
        href={`/posts/${post.id}`}
        className="block overflow-hidden rounded-md border border-paper-edge bg-vellum transition-all duration-200 hover:-translate-y-0.5 hover:border-sepia hover:shadow-card focus:outline-none focus:ring-2 focus:ring-gilded/40"
      >
        <div className="border-b border-paper-edge bg-parchment/35 px-3.5 py-2.5 pr-20">
          <div className="mb-1 flex min-w-0 flex-wrap items-center gap-1.5">
            <SignalBadge tone="neutral">
              {assetType ? skillLabel(assetType) : 'Skill'}
            </SignalBadge>
            <SignalBadge tone="neutral">{sceneLabel(post.tagScene)}</SignalBadge>
            {post.mcpApproved && <SignalBadge tone="mcp">MCP Ready</SignalBadge>}
            {post.featured && <SignalBadge tone="featured">精选</SignalBadge>}
          </div>
          <h2 className="font-serif text-[16px] leading-snug text-ink-brown transition-colors group-hover:text-wax-red line-clamp-2">
            <span title={post.title}>{post.displayTitle || post.title}</span>
          </h2>
        </div>

        <div className="px-3.5 py-3">
          <p className="font-sans text-[13px] leading-5 text-leather line-clamp-2">
            {post.displaySummary || post.excerpt}
          </p>
          <p className="mt-2 font-sans text-[11px] leading-5 text-sepia line-clamp-2">
            适合：{post.displayUseCase}
          </p>
          <div className="mt-2 flex items-center gap-1.5 font-sans text-[11px] text-sepia">
            <RoleBadge role={post.author.role} size={14} />
            <span className="truncate text-ink-brown">{post.skillAsset?.originalAuthor || post.author.nickname}</span>
            <span className="shrink-0">·</span>
            <TimeText value={post.createdAt} className="shrink-0" />
          </div>
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-paper-edge bg-parchment/20 px-3.5 py-2 font-sans text-xs text-sepia">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex items-center gap-1" title="浏览">
              <EyeIcon />
              {formatCount(post.viewCount)}
            </span>
            <span className="inline-flex items-center gap-1" title="评论">
              <CommentIcon />
              {formatCount(post.counts.comments)}
            </span>
            {post.counts.attachments > 0 && (
              <span className="inline-flex items-center gap-1" title="附件">
                <PaperclipIcon />
                {post.counts.attachments}
              </span>
            )}
          </div>
          <span className="shrink-0 font-serif italic text-leather">查看 →</span>
        </footer>
      </Link>

      <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
        <button
          type="button"
          onClick={toggleStar}
          className={cn(
            'inline-flex h-7 items-center gap-1 rounded-sm border border-paper-edge bg-vellum px-1.5 font-mono text-[10px] transition-colors',
            starred ? 'text-gilded' : 'text-sepia hover:text-ink-brown',
          )}
          title="收藏"
        >
          <StarIcon filled={starred} />
          {formatCount(stars)}
        </button>
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex h-7 items-center rounded-sm border border-paper-edge bg-vellum px-1.5 font-sans text-[10px] text-sepia transition-colors hover:text-ink-brown"
          title="复制链接"
        >
          {copied ? '已复制' : '复制'}
        </button>
      </div>
    </article>
  );
}

function SignalBadge({
  tone,
  children,
}: {
  tone: 'neutral' | 'mcp' | 'featured' | 'file';
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center border px-1.5 font-sans text-[10px]',
        tone === 'neutral' && 'border-paper-edge bg-vellum text-sepia',
        tone === 'mcp' && 'border-moss/50 bg-moss/5 text-moss',
        tone === 'featured' && 'border-ink-brown bg-parchment text-ink-brown',
        tone === 'file' && 'border-gilded/50 bg-gilded/5 text-gilded',
      )}
    >
      {children}
    </span>
  );
}

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

function EyeIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true">
      <path d="M1.5 8 C3 5, 5.5 3.5, 8 3.5 C10.5 3.5, 13 5, 14.5 8 C13 11, 10.5 12.5, 8 12.5 C5.5 12.5, 3 11, 1.5 8 Z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}
