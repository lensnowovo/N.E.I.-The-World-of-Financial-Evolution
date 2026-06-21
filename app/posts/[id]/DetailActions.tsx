'use client';

import { cn } from '@/lib/cn';
import { CopyPromptButton } from './CopyPromptButton';
import { formatCount } from '@/lib/format';

type PrimaryAttachment = {
  id: number;
  fileName: string;
} | null;

/**
 * 详情页顶部主操作区。
 *
 * - 有附件：显示「下载 {首附件名}」按钮（未登录跳登录）
 * - 提示词帖（assetType=prompt，无附件）：显示 CopyPromptButton
 * - 都没有：不渲染主操作，只显示热度数字
 *
 * 右侧常驻 3 个热度数字（浏览/赞/评论），font-mono 小字。
 */
export function DetailActions({
  postId,
  isAuthed,
  primaryAttachment,
  isPrompt,
  bodyHtml,
  viewCount,
  stars,
  commentsCount,
}: {
  postId: number;
  isAuthed: boolean;
  primaryAttachment: PrimaryAttachment;
  isPrompt: boolean;
  bodyHtml: string;
  viewCount: number;
  stars: number;
  commentsCount: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      {/* 主操作 */}
      <div className="flex items-center gap-2">
        {primaryAttachment ? (
          <DownloadButton
            postId={postId}
            isAuthed={isAuthed}
            attachmentId={primaryAttachment.id}
            fileName={primaryAttachment.fileName}
          />
        ) : isPrompt ? (
          <CopyPromptButton bodyHtml={bodyHtml} postId={postId} isAuthed={isAuthed} />
        ) : null}
      </div>

      {/* 热度数字 */}
      <div className="flex items-center gap-3 font-mono text-[11px] text-sepia">
        <Stat icon={<EyeIcon />} value={formatCount(viewCount)} label="浏览" />
        <Stat icon={<HeartIcon />} value={formatCount(stars)} label="赞" />
        <Stat icon={<CommentIcon />} value={formatCount(commentsCount)} label="评论" />
      </div>
    </div>
  );
}

/** 下载按钮：已登录直接下载，未登录跳登录页 */
function DownloadButton({
  postId,
  isAuthed,
  attachmentId,
  fileName,
}: {
  postId: number;
  isAuthed: boolean;
  attachmentId: number;
  fileName: string;
}) {
  // 下载免费开放：不要求登录。
  const label = fileName.length > 28 ? fileName.slice(0, 25) + '…' : fileName;

  return (
    <a
      href={`/api/files/${attachmentId}/download`}
      download
      className="inline-flex items-center gap-2 h-10 px-5 bg-ink-brown text-vellum hover:bg-wax-red font-serif text-sm rounded-sm transition-colors"
    >
      <DownloadIcon />
      下载 {label}
    </a>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1" title={label}>
      {icon}
      <span className="num-osf">{value}</span>
    </span>
  );
}

/* —— 极简线性图标 —— */
function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M8 2 V10 M4.5 7 L8 10.5 L11.5 7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 13 H13" strokeLinecap="round" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true">
      <path d="M1.5 8 C3 5, 5.5 3.5, 8 3.5 C10.5 3.5, 13 5, 14.5 8 C13 11, 10.5 12.5, 8 12.5 C5.5 12.5, 3 11, 1.5 8 Z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M8 14 C4 11, 1.5 8.5, 1.5 6 C1.5 4, 3 2.5, 5 2.5 C6.5 2.5, 7.5 3.3, 8 4.5 C8.5 3.3, 9.5 2.5, 11 2.5 C13 2.5, 14.5 4, 14.5 6 C14.5 8.5, 12 11, 8 14 Z" />
    </svg>
  );
}
function CommentIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M2.5 4 H13.5 V11 H8.5 L5.5 13.5 V11 H2.5 Z" strokeLinejoin="round" />
    </svg>
  );
}
