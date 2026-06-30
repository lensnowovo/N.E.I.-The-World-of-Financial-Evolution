'use client';

import { useState } from 'react';

type PreviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; text: string; chars: number; truncated: boolean }
  | { status: 'error'; message: string };

export function LazySkillPreview({
  attachmentId,
  fileName,
}: {
  attachmentId: number;
  fileName: string;
}) {
  const [state, setState] = useState<PreviewState>({ status: 'idle' });
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (!ext || !['md', 'markdown', 'txt'].includes(ext)) return null;

  const loadPreview = async () => {
    if (state.status !== 'idle') return;

    setState({ status: 'loading' });
    try {
      const res = await fetch(`/api/files/${attachmentId}/preview`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || '预览加载失败');
      }

      setState({
        status: 'ready',
        text: data.text || '',
        chars: data.chars || 0,
        truncated: !!data.truncated,
      });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : '预览加载失败',
      });
    }
  };

  return (
    <details
      className="group mt-8 rounded-md border border-paper-edge bg-vellum/40"
      onToggle={(event) => {
        if (event.currentTarget.open) void loadPreview();
      }}
    >
      <summary className="cursor-pointer list-none flex items-center gap-2 px-4 py-3 select-none hover:bg-vellum/60 transition-colors">
        <svg
          className="shrink-0 text-sepia transition-transform group-open:rotate-90"
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M3 1.5 L7 5 L3 8.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-serif text-sm text-ink-brown">查看 {fileName} 原文</span>
        <span className="font-sans text-[11px] text-sepia">展开后加载</span>
      </summary>

      <div className="border-t border-paper-edge px-5 pb-5 pt-4">
        {state.status === 'idle' || state.status === 'loading' ? (
          <p className="font-sans text-xs text-sepia">
            {state.status === 'loading' ? '正在加载原文…' : '展开后加载原文，避免拖慢页面首屏。'}
          </p>
        ) : state.status === 'error' ? (
          <p className="font-sans text-xs text-wax-red">{state.message}</p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] text-sepia">
                {state.chars.toLocaleString()} 字符
                {state.truncated ? ' · 已截断预览' : ''}
              </p>
              <a
                href={`/api/files/${attachmentId}/download`}
                download
                className="font-sans text-[11px] text-wax-red hover:underline"
              >
                下载完整文件
              </a>
            </div>
            <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap rounded bg-parchment p-4 font-mono text-xs leading-6 text-ink-brown">
              {state.text}
            </pre>
          </>
        )}
      </div>
    </details>
  );
}
