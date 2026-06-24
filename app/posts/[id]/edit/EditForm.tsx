'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { RichEditor } from '@/components/RichEditor';
import { Button } from '@/components/ui/Button';
import {
  SCENE_TAGS,
  INDUSTRY_TAGS,
  CONTENT_TAGS,
  skillLabel,
} from '@/lib/tags';

type Props = {
  postId: number;
  initialTitle: string;
  initialBody: string;
  initialTagScene: string;
  initialTagIndustry: string | null;
  initialTagContent: string[];
  initialTagSkill: string | null;
  isDraft: boolean;
};

/**
 * 从 `<pre>...</pre>` 包裹的 body 中还原提示词原文。
 * 发布时 body = `<pre>${escapeHtml(promptText)}</pre>`，这里反向操作。
 * 多个 <pre> 块用 `\n\n` 连接；不含 <pre> 时直接 strip 标签兜底。
 */
function extractPromptText(body: string): string {
  const matches = body.match(/<pre[^>]*>([\s\S]*?)<\/pre>/gi);
  if (matches && matches.length > 0) {
    return matches
      .map((m) => m.replace(/^<pre[^>]*>/i, '').replace(/<\/pre>$/i, ''))
      .join('\n\n')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
  // 兜底：直接去标签
  return body.replace(/<[^>]*>/g, '').trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** 提示词帖的 body 存储 = `<pre>${escapeHtml(text)}</pre>` */
function encodePromptBody(text: string): string {
  return `<pre>${escapeHtml(text)}</pre>`;
}

export function EditForm({
  postId,
  initialTitle,
  initialBody,
  initialTagScene,
  initialTagIndustry,
  initialTagContent,
  initialTagSkill,
  isDraft,
}: Props) {
  const router = useRouter();
  const isPrompt = initialTagSkill === 'prompt';

  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [promptText, setPromptText] = useState(
    isPrompt ? extractPromptText(initialBody) : '',
  );
  const [scene, setScene] = useState(initialTagScene);
  const [industry, setIndustry] = useState(initialTagIndustry ?? '');
  const [contents, setContents] = useState<string[]>(initialTagContent);

  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleContent = (v: string) => {
    if (contents.includes(v)) setContents(contents.filter((x) => x !== v));
    else if (contents.length < 3) setContents([...contents, v]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');

    if (title.trim().length < 5 || title.trim().length > 100) {
      setErr('标题需 5-100 字符');
      return;
    }
    if (!scene) {
      setErr('请选一个「用在哪个环节」');
      return;
    }

    // 根据 prompt / 非 prompt 推导最终 body
    const finalBody = isPrompt ? encodePromptBody(promptText) : body;
    if (
      !finalBody ||
      finalBody.replace(/<[^>]*>/g, '').trim().length === 0
    ) {
      setErr('内容还没写');
      return;
    }

    setSaving(true);
    const res = await fetch(`/api/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        body: finalBody,
        tagScene: scene,
        tagIndustry: industry || null,
        tagContent: contents,
        tagSkill: initialTagSkill, // 不允许改类型，原样回传
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setErr(data.error || '保存失败');
      return;
    }
    router.push(`/posts/${postId}`);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-section">
      {/* ===== 标题 ===== */}
      <Section title="标题" hint="一句话概括，让别人一眼知道这是啥">
        <input
          className={cn(
            'w-full bg-transparent border-0 border-b border-paper-edge',
            'font-serif text-2xl sm:text-3xl text-ink-brown placeholder:text-sepia/60 italic',
            'focus:border-ink-brown focus:outline-none transition-colors',
            'py-3',
          )}
          maxLength={100}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <p className="mt-1 font-sans text-[11px] text-sepia text-right num-osf">
          {title.length}/100
        </p>
      </Section>

      {/* ===== 正文 ===== */}
      {isPrompt ? (
        <Section title="提示词" hint="方括号 [像这样] 标出要替换的部分">
          <textarea
            className={cn(
              'w-full bg-vellum/50 border border-paper-edge rounded px-4 py-3',
              'font-mono text-sm text-ink-brown placeholder:text-sepia/60',
              'focus:border-ink-brown focus:outline-none transition-colors',
              'resize-y min-h-[240px]',
            )}
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
          />
        </Section>
      ) : (
        <Section title="正文" hint="按步骤写，每一步写清楚输入和产出">
          <RichEditor
            value={body}
            onChange={setBody}
            placeholder="此处书写正文…"
          />
        </Section>
      )}

      {/* ===== 用在哪个环节 ===== */}
      <Section title="用在哪个环节？" hint="必填 · 选一个最贴的">
        <div className="space-y-1.5">
          {SCENE_TAGS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setScene(t.value)}
              className={cn(
                'w-full text-left flex items-baseline gap-3 px-3 py-2 rounded border transition-colors',
                scene === t.value
                  ? 'border-ink-brown bg-parchment'
                  : 'border-paper-edge bg-vellum/40 hover:border-sepia',
              )}
            >
              <span
                className={cn(
                  'font-serif text-sm shrink-0',
                  scene === t.value ? 'text-ink-brown' : 'text-leather',
                )}
              >
                {t.label}
              </span>
              <span className="font-sans text-[11px] text-sepia truncate">
                {t.example}
              </span>
            </button>
          ))}
        </div>
      </Section>

      {/* ===== 补充标签 ===== */}
      <Section title="补充标签" hint="行业、工作内容，让分类更准">
        <Dimension label="行业赛道" hint="选填 · 单选">
          <ChipSet>
            <PillChip active={industry === ''} onClick={() => setIndustry('')}>
              不指定
            </PillChip>
            {INDUSTRY_TAGS.map((t) => (
              <PillChip
                key={t.value}
                active={industry === t.value}
                onClick={() => setIndustry(t.value)}
              >
                {t.label}
              </PillChip>
            ))}
          </ChipSet>
        </Dimension>

        <Dimension label="工作内容" hint={`多选 · 最多 3 个 · 已选 ${contents.length}`}>
          <ChipSet>
            {CONTENT_TAGS.map((t) => (
              <FoldChip
                key={t.value}
                active={contents.includes(t.value)}
                disabled={!contents.includes(t.value) && contents.length >= 3}
                onClick={() => toggleContent(t.value)}
              >
                {t.label}
              </FoldChip>
            ))}
          </ChipSet>
        </Dimension>

        {/* tagSkill 只读展示 —— 改类型会让 body 存储格式错乱，故不允许编辑 */}
        {initialTagSkill && (
          <Dimension label="类型" hint="不可修改">
            <span className="inline-flex items-center px-3 h-7 text-xs font-sans rounded-sm border border-paper-edge bg-linen text-sepia">
              {skillLabel(initialTagSkill)}
            </span>
          </Dimension>
        )}
      </Section>

      {isDraft && (
        <p className="font-sans text-xs text-sepia italic">
          注：此帖当前不是已发布状态。保存后状态不变。
        </p>
      )}

      {/* —— 错误 + 提交 —— */}
      {err && (
        <p className="font-sans text-sm text-wax-red border-l border-wax-red pl-3">
          {err}
        </p>
      )}

      <div className="border-t border-paper-edge pt-6 flex items-center justify-between gap-3">
        <Link
          href={`/posts/${postId}`}
          className="font-serif italic text-xs text-sepia hover:text-ink-brown transition-colors"
        >
          放弃修改，返回
        </Link>
        <div className="flex gap-3 ml-auto">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={saving}
          >
            取消
          </Button>
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? '正在保存…' : '保存修改'}
          </Button>
        </div>
      </div>
    </form>
  );
}

/* ============================================================
   局部 UI helpers —— 与 app/publish/PublishForm 保持视觉一致
   ============================================================ */
function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="font-serif text-xl text-ink-brown">{title}</h2>
        {hint && (
          <span className="font-serif italic text-xs text-sepia">· {hint}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function Dimension({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="flex items-baseline gap-2 mb-2">
        <span className="font-serif text-sm text-ink-brown">{label}</span>
        {hint && (
          <span className="font-sans text-[10px] text-sepia tracking-wide">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function ChipSet({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}

function PillChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-3 h-7 text-xs font-sans rounded-full transition-colors',
        active ? 'bg-leather text-vellum' : 'bg-linen text-leather hover:bg-paper-edge',
      )}
    >
      {children}
    </button>
  );
}

function FoldChip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center px-2.5 h-7 text-xs font-sans transition-colors',
        active
          ? 'border border-ink-brown bg-parchment text-ink-brown'
          : 'border border-paper-edge bg-parchment text-leather hover:border-sepia',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      {children}
    </button>
  );
}
