'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { formatTime, formatCount } from '@/lib/format';
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
    return <CompactPostCard post={post} currentUserId={currentUserId} />;
  }
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

          {/* —— 作者条 —— */}
          <div className="flex items-center gap-2 mb-3 font-sans text-xs text-sepia">
            <RoleBadge role={post.author.role} size={16} />
            <span className="text-ink-brown">{post.author.nickname}</span>
            <DotSep />
            <span>{formatTime(post.createdAt)}</span>
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
  const assetType = post.skillAsset?.assetType ?? post.tagSkill ?? '';
  const pathToken = `${post.tagScene}/${assetType || '-'}`;

  return (
    <article className="group relative h-full">
      <Link href={`/posts/${post.id}`} className="block h-full">
        <div
          className={cn(
            'relative flex flex-col h-full border border-paper-edge bg-vellum rounded-md',
            'transition-all duration-200 group-hover:border-sepia group-hover:-translate-y-0.5 group-hover:shadow-card',
            'p-3 sm:p-4',
          )}
        >
          {/* —— 顶 meta 行：中文 skill·scene + 小号 path 点缀 —— */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <SkillIcon skill={assetType} className="h-3.5 w-3.5 shrink-0 text-wax-red" />
              <span className="font-serif text-xs text-ink-brown truncate">
                {assetType ? skillLabel(assetType) : '内容'}
                <span className="text-sepia">·</span>
                {sceneLabel(post.tagScene)}
              </span>
            </div>
            <span className="font-mono text-[10px] text-sepia shrink-0 hidden sm:inline">
              {pathToken}
            </span>
          </div>

          {/* —— 标题（单行 truncate）—— */}
          <h2 className="font-serif text-base leading-snug text-ink-brown mb-1.5 group-hover:text-wax-red transition-colors truncate">
            {post.title}
          </h2>

          {/* —— 摘要（2 行 clamp）—— */}
          <p
            className="font-sans text-xs text-leather leading-relaxed mb-3 flex-1"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {post.excerpt}
          </p>

          {/* —— 底 meta 行：作者 + 热度数据 —— */}
          <div className="pt-2 border-t border-paper-edge flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 font-sans text-[11px]">
              <RoleBadge role={post.author.role} size={14} />
              <span className="text-ink-brown truncate">
                {post.skillAsset?.originalAuthor || post.author.nickname}
              </span>
              <span className="text-sepia/60 shrink-0">·</span>
              <span className="text-sepia shrink-0">{formatTime(post.createdAt)}</span>
            </div>

            <div className="flex items-center gap-2.5 font-mono text-[10px] text-sepia shrink-0">
              <span className="inline-flex items-center gap-0.5" title="浏览">
                <EyeIcon />
                {formatCount(post.viewCount)}
              </span>
              <button
                type="button"
                onClick={toggleStar}
                className={cn(
                  'inline-flex items-center gap-0.5 transition-colors cursor-pointer',
                  starred ? 'text-gilded' : 'hover:text-ink-brown',
                )}
                title="Star"
              >
                <StarIcon filled={starred} />
                {formatCount(stars)}
              </button>
              <span className="inline-flex items-center gap-0.5" title="评论">
                <CommentIcon />
                {formatCount(post.counts.comments)}
              </span>
              {post.counts.attachments > 0 && (
                <span className="inline-flex items-center gap-0.5" title="附件">
                  <PaperclipIcon />
                  {post.counts.attachments}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </article>
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
