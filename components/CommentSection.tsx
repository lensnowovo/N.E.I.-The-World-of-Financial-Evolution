'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { RoleBadge } from '@/components/icons/RoleBadge';

type Author = {
  id: number;
  nickname: string;
  role: string;
  avatarUrl: string | null;
};
type Comment = {
  id: number;
  postId: number;
  parentId: number | null;
  body: string;
  likeCount: number;
  liked?: boolean;
  createdAt: string;
  author: Author;
  replies: Comment[];
};

/**
 * CommentSection · 详情页评论与问答
 * 评论：左侧细线纵向边 + 衬线人名 + 无衬线正文
 * 回复：再缩进一级，左线变得更浅
 * 空状态：预设几个常见问题，点击填入输入框，降低发言门槛
 */
export function CommentSection({
  postId,
  postAuthorId,
  assetType,
  currentUser,
}: {
  postId: number;
  postAuthorId: number;
  assetType: string | null;
  currentUser: { id: number; nickname: string; role: string } | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: number; nickname: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => {
    const res = await fetch(`/api/posts/${postId}/comments`);
    const data = await res.json();
    setItems(data.items);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, [postId]);

  const submit = async () => {
    if (!currentUser) {
      router.push(`/login?next=/posts/${postId}`);
      return;
    }
    const body = text.trim();
    if (body.length < 1 || body.length > 1000) return;
    setSubmitting(true);
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, parentId: replyTo?.id ?? null }),
    });
    setSubmitting(false);
    if (res.ok) {
      setText('');
      setReplyTo(null);
      refresh();
    }
  };

  const remove = async (id: number) => {
    if (!confirm('确定删除这条评论？')) return;
    await fetch(`/api/comments/${id}`, { method: 'DELETE' });
    refresh();
  };

  const total = items.reduce((n, c) => n + 1 + c.replies.length, 0);

  return (
    <section className="mt-12">
      {/* 章节小标题 */}
      <div className="flex items-baseline gap-3 mb-6">
        <h3 className="font-serif text-xl text-ink-brown">评论与问答</h3>
        {total > 0 && (
          <span className="font-serif italic text-sm text-sepia">
            共 <span className="num-osf">{total}</span> 条
          </span>
        )}
      </div>

      {/* 输入区 */}
      <div className="border border-paper-edge bg-vellum rounded-md p-5 mb-8">
        {replyTo && (
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-paper-edge font-sans text-xs">
            <span className="text-sepia">回复</span>
            <span className="font-serif italic text-ink-brown">@{replyTo.nickname}</span>
            <button
              onClick={() => setReplyTo(null)}
              className="ml-auto text-sepia hover:text-wax-red"
              aria-label="取消回复"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2">
                <path d="M1 1 L9 9 M9 1 L1 9" />
              </svg>
            </button>
          </div>
        )}

        <Textarea
          id="comment-input"
          rows={3}
          maxLength={1000}
          placeholder={
            currentUser
              ? '问个问题、提个需求，或说说你的用法…（1-1000 字）'
              : '登录后评论'
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!currentUser}
        />

        <div className="mt-3 flex items-center justify-between font-sans text-xs">
          <span className="text-sepia num-osf">
            {text.length}/1000
          </span>
          {currentUser ? (
            <Button
              size="sm"
              onClick={submit}
              disabled={submitting || text.trim().length === 0}
            >
              {submitting ? '发布中…' : '发布'}
            </Button>
          ) : (
            <Link
              href={`/login?next=/posts/${postId}`}
              className="font-serif italic text-sepia hover:text-ink-brown underline underline-offset-4 decoration-paper-edge hover:decoration-ink-brown"
            >
              登录后评论
            </Link>
          )}
        </div>
      </div>

      {/* 评论列表 */}
      {loading ? (
        <p className="text-center font-serif italic text-sm text-sepia py-6">
          加载评论…
        </p>
      ) : items.length === 0 ? (
        <EmptyComments
          assetType={assetType}
          canComment={!!currentUser}
          onPick={(q) => {
            setText(q);
            // 滚动到输入框，方便用户接着写或直接发
            const ta = document.getElementById('comment-input');
            ta?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            ta?.focus();
          }}
        />
      ) : (
        <ul className="space-y-7">
          {items.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              postAuthorId={postAuthorId}
              currentUser={currentUser}
              onReply={(target) => {
                // 回复目标只靠 replyTo.id 标识，不往正文插 @昵称（避免污染正文 + 二次回复不替换前缀）
                setReplyTo({ id: target.id, nickname: target.author.nickname });
              }}
              onDelete={remove}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/* ============================================================
   单条评论
   ============================================================ */
function CommentItem({
  comment,
  postAuthorId,
  currentUser,
  onReply,
  onDelete,
}: {
  comment: Comment;
  postAuthorId: number;
  currentUser: { id: number } | null;
  onReply: (c: Comment) => void;
  onDelete: (id: number) => void;
}) {
  const isAuthor = comment.author.id === postAuthorId;
  const canDelete =
    currentUser && (currentUser.id === comment.author.id || currentUser.id === postAuthorId);

  return (
    <li className="relative">
      {/* 顶层评论 —— 左侧细线 */}
      <div className="border-l border-paper-edge pl-5">
        <CommentHead author={comment.author} isAuthor={isAuthor} createdAt={comment.createdAt} />
        <p className="mt-2 font-sans text-sm text-ink-brown leading-relaxed whitespace-pre-wrap">
          {comment.body}
        </p>
        <CommentActions
          commentId={comment.id}
          initialLiked={!!comment.liked}
          initialLikeCount={comment.likeCount}
          currentUser={currentUser}
          onReply={() => onReply(comment)}
          canDelete={!!canDelete}
          onDelete={() => onDelete(comment.id)}
        />
      </div>

      {/* 二级回复 */}
      {comment.replies.length > 0 && (
        <ul className="mt-4 ml-5 space-y-4">
          {comment.replies.map((r) => (
            <li key={r.id} className="border-l border-paper-edge/70 pl-5">
              <CommentHead
                author={r.author}
                isAuthor={r.author.id === postAuthorId}
                createdAt={r.createdAt}
                small
              />
              <p className="mt-1.5 font-sans text-sm text-ink-brown leading-relaxed whitespace-pre-wrap">
                {r.body}
              </p>
              <CommentActions
                commentId={r.id}
                initialLiked={!!r.liked}
                initialLikeCount={r.likeCount}
                currentUser={currentUser}
                onReply={() => onReply(r)}
                canDelete={
                  !!currentUser &&
                  (currentUser.id === r.author.id || currentUser.id === postAuthorId)
                }
                onDelete={() => onDelete(r.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function CommentHead({
  author,
  isAuthor,
  createdAt,
  small,
}: {
  author: Author;
  isAuthor: boolean;
  createdAt: string;
  small?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-2 font-sans', small ? 'text-[11px]' : 'text-xs')}>
      <RoleBadge role={author.role} size={small ? 13 : 15} />
      <Link
        href={`/profile/${author.id}`}
        className="font-serif text-base text-ink-brown hover:text-wax-red transition-colors"
        style={{ fontSize: small ? '14px' : '15px' }}
      >
        {author.nickname}
      </Link>
      {isAuthor && (
        <span className="px-1.5 border border-gilded/60 text-gilded font-serif text-[10px] tracking-wide">
          原作
        </span>
      )}
      <span className="text-sepia">·</span>
      <span className="text-sepia">{formatTime(createdAt)}</span>
    </div>
  );
}

function CommentActions({
  commentId,
  initialLiked,
  initialLikeCount,
  currentUser,
  onReply,
  canDelete,
  onDelete,
}: {
  commentId: number;
  initialLiked: boolean;
  initialLikeCount: number;
  currentUser: { id: number } | null;
  onReply: () => void;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [busy, setBusy] = useState(false);

  const toggleLike = async () => {
    if (!currentUser) {
      router.push(`/login?next=${window.location.pathname}`);
      return;
    }
    if (busy) return;
    // 乐观更新
    const next = !liked;
    setLiked(next);
    setLikeCount((n) => n + (next ? 1 : -1));
    setBusy(true);
    try {
      const res = await fetch(`/api/comments/${commentId}/like`, { method: 'POST' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (typeof data.likeCount === 'number') setLikeCount(data.likeCount);
    } catch {
      // 回滚
      setLiked(!next);
      setLikeCount((n) => n + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 flex items-center gap-4 font-sans text-xs text-sepia">
      <button
        onClick={toggleLike}
        disabled={busy}
        className={cn(
          'inline-flex items-center gap-1 transition-colors',
          liked ? 'text-wax-red' : 'hover:text-ink-brown',
        )}
      >
        <HeartIcon filled={liked} />
        {likeCount > 0 && <span className="num-osf">{likeCount}</span>}
      </button>
      <button onClick={onReply} className="hover:text-ink-brown transition-colors">
        回复
      </button>
      {canDelete && (
        <button onClick={onDelete} className="hover:text-wax-red transition-colors">
          删除
        </button>
      )}
    </div>
  );
}

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M8 14 C4 11, 1.5 8.5, 1.5 6 C1.5 4, 3 2.5, 5 2.5 C6.5 2.5, 7.5 3.3, 8 4.5 C8.5 3.3, 9.5 2.5, 11 2.5 C13 2.5, 14.5 4, 14.5 6 C14.5 8.5, 12 11, 8 14 Z" />
    </svg>
  );
}

/* ============================================================
   空状态 · 预设问题引导（降低冷启动期的发言门槛）
   根据 assetType 给出不同的问题模板，点击填入输入框
   ============================================================ */
const PRESET_QUESTIONS: Record<string, string[]> = {
  prompt: [
    '这个提示词用在哪个场景效果最好？',
    '有没有针对 [XX 行业] 的改法？',
    '我用的时候输出不太对，可能哪里没填对？',
  ],
  'agent-skill': [
    '这个 SKILL.md 怎么装到我的 Claude Code 里？',
    '不会写代码能用吗？有没有更简单的办法？',
    '装上之后具体怎么触发它？',
  ],
  template: [
    '这个模板填起来有哪些坑要注意？',
    '有没有 Excel / Google Sheets 版本？',
    '适合多大体量的项目用？',
  ],
  workflow: [
    '完整跑一遍大概要多久？',
    '哪一步最容易卡住？',
    '有没有更快的简化版？',
  ],
  default: [
    '这个怎么用？有没有更详细的说明？',
    '有没有人在 [XX 场景] 试过，效果怎么样？',
    '遇到问题可以问谁？',
  ],
};

function getPresetQuestions(assetType: string | null): string[] {
  return PRESET_QUESTIONS[assetType ?? 'default'] ?? PRESET_QUESTIONS.default;
}

function EmptyComments({
  assetType,
  canComment,
  onPick,
}: {
  assetType: string | null;
  canComment: boolean;
  onPick: (q: string) => void;
}) {
  const questions = getPresetQuestions(assetType);
  return (
    <div className="border border-paper-edge bg-vellum/50 rounded-md py-8 px-6 text-center">
      <p className="font-serif italic text-leather mb-1">
        还没有评论
      </p>
      <p className="font-sans text-xs text-sepia mb-5">
        第一个提问或分享用法的人，就是你
      </p>
      {canComment && (
        <div className="flex flex-wrap justify-center gap-2">
          {questions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onPick(q)}
              className="inline-flex items-center h-7 px-3 text-xs font-sans text-leather border border-paper-edge bg-parchment rounded-full hover:border-ink-brown hover:text-ink-brown transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

