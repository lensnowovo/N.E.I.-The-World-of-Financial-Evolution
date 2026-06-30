'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { sceneLabel, industryLabel, contentLabel } from '@/lib/tags';
import { sanitizeHtml } from '@/lib/validate';
import type { PublishSuggestion } from '@/lib/ai';

type Branch = 'prompt' | 'file' | 'method';

/**
 * 智能发布辅助面板。
 *
 * 用户在表单里写了标题 + 正文后，点「AI 帮我补全」→ 调 /api/ai/assist →
 * 展示建议（标题/场景/行业/内容标签/摘要/占位符），逐条「应用」回填表单。
 *
 * 所有应用动作由父组件通过回调决定（不同分支正文写法不同），本组件只负责展示 + 触发。
 */
export function AiAssistPanel({
  branch,
  title,
  bodyText,
  /** file/method 分支可把摘要写进正文；prompt 分支正文即提示词本身，不写 */
  canApplySummary,
  onApplyTitle,
  onApplyScene,
  onApplyIndustry,
  onApplyContents,
  onApplySummary,
  currentScene,
  currentIndustry,
  currentContents,
}: {
  branch: Branch | null;
  title: string;
  bodyText: string;
  canApplySummary: boolean;
  onApplyTitle: (s: string) => void;
  onApplyScene: (s: string) => void;
  onApplyIndustry: (s: string | null) => void;
  onApplyContents: (vals: string[]) => void;
  onApplySummary: (html: string) => void;
  currentScene: string;
  currentIndustry: string;
  currentContents: string[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [sug, setSug] = useState<PublishSuggestion | null>(null);

  const contentLen = bodyText.replace(/\s/g, '').length;
  const canCall = !!branch && contentLen >= 20;
  const safeSummary = sug?.summary ? sanitizeHtml(sug.summary) : '';

  const run = async () => {
    setErr('');
    setLoading(true);
    try {
      const res = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body: bodyText, branch }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || 'AI 辅助失败');
        return;
      }
      setSug(data.suggestion);
      setOpen(true);
    } catch {
      setErr('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-paper-edge bg-vellum/40 rounded-md p-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-serif text-sm text-ink-brown">✨ AI 帮你补全</span>
        <span className="font-sans text-[11px] text-sepia">
          {branch ? `已写 ${contentLen} 字，可让 AI 建议标题/分类/摘要${branch === 'prompt' ? '/占位符' : ''}` : '先选一个类型，写点正文'}
        </span>
        <button
          type="button"
          onClick={run}
          disabled={!canCall || loading}
          className={cn(
            'ml-auto inline-flex items-center h-8 px-4 font-serif text-sm rounded-sm transition-colors shrink-0',
            'border border-gilded/50 bg-gilded/10 text-ink-brown hover:bg-gilded/20',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          {loading ? 'AI 思考中…' : sug ? '重新建议' : '生成建议'}
        </button>
      </div>

      {err && <p className="mt-2 font-sans text-xs text-wax-red">{err}</p>}

      {sug && open && (
        <div className="mt-4 space-y-3 border-t border-paper-edge pt-4">
          {/* 标题 */}
          {sug.title && sug.title !== title && (
            <SuggestRow label="标题建议">
              <span className="font-serif text-sm text-ink-brown">{sug.title}</span>
              <ApplyBtn onClick={() => onApplyTitle(sug.title)}>应用</ApplyBtn>
            </SuggestRow>
          )}

          {/* 场景 */}
          {sug.scene && (
            <SuggestRow label="用在哪个环节">
              <span className="font-serif text-sm text-ink-brown">{sceneLabel(sug.scene)}</span>
              {currentScene !== sug.scene && <ApplyBtn onClick={() => onApplyScene(sug.scene)}>应用</ApplyBtn>}
              {currentScene === sug.scene && <span className="font-sans text-[11px] text-moss">已选</span>}
            </SuggestRow>
          )}

          {/* 行业 */}
          {sug.industry && (
            <SuggestRow label="行业">
              <span className="font-serif text-sm text-ink-brown">{industryLabel(sug.industry)}</span>
              {currentIndustry !== sug.industry && <ApplyBtn onClick={() => onApplyIndustry(sug.industry)}>应用</ApplyBtn>}
              {currentIndustry === sug.industry && <span className="font-sans text-[11px] text-moss">已选</span>}
            </SuggestRow>
          )}

          {/* 内容标签 */}
          {sug.contents.length > 0 && (
            <SuggestRow label="工作内容标签">
              <div className="flex flex-wrap gap-1.5">
                {sug.contents.map((c) => (
                  <span key={c} className="font-sans text-[11px] px-2 py-0.5 bg-parchment border border-paper-edge rounded-sm text-leather">
                    {contentLabel(c)}
                  </span>
                ))}
              </div>
              <ApplyBtn
                onClick={() => {
                  // 合并去重，最多 3 个
                  const merged = Array.from(new Set([...currentContents, ...sug.contents])).slice(0, 3);
                  onApplyContents(merged);
                }}
              >
                应用全部
              </ApplyBtn>
            </SuggestRow>
          )}

          {/* 摘要 */}
          {canApplySummary && safeSummary && (
            <SuggestRow label="摘要（可写入正文开头）">
              <div
                className="font-serif text-sm text-leather italic line-clamp-3 max-h-24 overflow-hidden"
                dangerouslySetInnerHTML={{ __html: safeSummary }}
              />
              <ApplyBtn onClick={() => onApplySummary(safeSummary)}>写入正文</ApplyBtn>
            </SuggestRow>
          )}
          {!canApplySummary && safeSummary && (
            <SuggestRow label="摘要">
              <div
                className="font-serif text-sm text-leather italic line-clamp-3 max-h-24 overflow-hidden"
                dangerouslySetInnerHTML={{ __html: safeSummary }}
              />
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(safeSummary.replace(/<[^>]*>/g, ''))}
                className="font-sans text-[11px] text-sepia hover:text-ink-brown"
              >
                复制
              </button>
            </SuggestRow>
          )}

          {/* 占位符（prompt 分支） */}
          {branch === 'prompt' && sug.placeholders.length > 0 && (
            <SuggestRow label="占位符（需使用者替换的变量）">
              <ul className="space-y-1">
                {sug.placeholders.map((p, i) => (
                  <li key={i} className="font-sans text-xs text-leather">
                    <code className="font-mono text-ink-brown">{p.name}</code>
                    {p.desc && <span className="text-sepia"> — {p.desc}</span>}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  const note = sug.placeholders.map((p) => `- ${p.name}${p.desc ? `：${p.desc}` : ''}`).join('\n');
                  navigator.clipboard?.writeText(note);
                }}
                className="font-sans text-[11px] text-sepia hover:text-ink-brown"
              >
                复制说明
              </button>
            </SuggestRow>
          )}

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="font-sans text-[11px] text-sepia hover:text-ink-brown"
          >
            收起建议
          </button>
        </div>
      )}
    </div>
  );
}

function SuggestRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 flex-wrap">
      <span className="font-sans text-[11px] text-sepia w-20 shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 min-w-0 flex items-start gap-3 flex-wrap">{children}</div>
    </div>
  );
}

function ApplyBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-sans text-[11px] text-wax-red hover:underline shrink-0"
    >
      {children}
    </button>
  );
}
