'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { formatBytes, truncate } from '@/lib/format';
import { FileSeal } from '@/components/icons/FileSeal';

export type UploadedFile = {
  id: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
};

const ACCEPT = '.pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.png,.jpg,.jpeg,.mp4,.zip,.md';
const MAX_FILES = 5;
const MAX_SIZE = 100 * 1024 * 1024;

/**
 * AttachmentUploader · 卷宗附件投递区
 * 羊皮纸虚框 · 蜡封文件标识 · 细线进度
 * 不使用 emoji
 */
export function AttachmentUploader({
  files,
  onChange,
}: {
  files: UploadedFile[];
  onChange: (next: UploadedFile[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ name: string; pct: number } | null>(null);
  const [err, setErr] = useState('');
  const [drag, setDrag] = useState(false);

  const upload = async (fileList: FileList) => {
    setErr('');
    const arr = Array.from(fileList);
    if (files.length + arr.length > MAX_FILES) {
      setErr(`单卷最多 ${MAX_FILES} 件附件`);
      return;
    }
    let curr = [...files];
    for (const f of arr) {
      if (f.size > MAX_SIZE) {
        setErr(`${f.name} 超过 100 MB`);
        continue;
      }
      setProgress({ name: f.name, pct: 15 });
      const fd = new FormData();
      fd.append('file', f);
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        setProgress({ name: f.name, pct: 75 });
        const data = await res.json();
        if (!res.ok) {
          setErr(data.error || '投递失败');
          continue;
        }
        curr = [...curr, data];
        onChange(curr);
        setProgress({ name: f.name, pct: 100 });
      } catch {
        setErr('网络错误');
      }
    }
    setProgress(null);
  };

  const remove = async (id: number) => {
    await fetch(`/api/upload/${id}`, { method: 'DELETE' });
    onChange(files.filter((f) => f.id !== id));
  };

  return (
    <div>
      {/* —— 拖拽投递区 —— */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
        }}
        className={cn(
          'w-full rounded-md border-2 border-dashed transition-colors',
          'px-6 py-8 text-center',
          drag
            ? 'border-ink-brown bg-parchment'
            : 'border-paper-edge bg-vellum hover:border-sepia',
        )}
      >
        <div className="flex justify-center mb-3 text-leather">
          <EnvelopeIcon />
        </div>
        <p className="font-serif text-base text-ink-brown">
          拖拽附件至此 · 或<span className="underline underline-offset-4 decoration-paper-edge ml-1">点击挑选</span>
        </p>
        <p className="mt-2 font-serif italic text-xs text-sepia">
          可接受 PDF · DOCX · XLSX · PPTX · 图片 · MP4 · ZIP · MD
        </p>
        <p className="mt-1 font-sans text-[11px] text-sepia">
          单卷最多 {MAX_FILES} 件 · 单件 ≤ 100 MB
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
      </button>

      {/* —— 进度条 —— */}
      {progress && (
        <div className="mt-3 px-4 py-2 border border-paper-edge bg-vellum rounded-sm">
          <div className="flex items-center justify-between font-sans text-xs text-sepia">
            <span className="truncate font-serif text-leather italic">
              正在落档 · {truncate(progress.name, 36)}
            </span>
            <span className="num-osf">{progress.pct}%</span>
          </div>
          <div className="mt-1.5 h-px w-full bg-paper-edge overflow-hidden">
            <div
              className="h-full bg-ink-brown transition-all"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        </div>
      )}

      {/* —— 错误提示 —— */}
      {err && (
        <p className="mt-3 text-sm font-sans text-wax-red border-l border-wax-red pl-3">
          {err}
        </p>
      )}

      {/* —— 已上传列表 —— */}
      {files.length > 0 && (
        <ul className="mt-4 border-t border-paper-edge">
          {files.map((f) => {
            const ext = (f.fileName.split('.').pop() ?? '?').toLowerCase();
            return (
              <li
                key={f.id}
                className="flex items-center gap-4 py-3 border-b border-paper-edge"
              >
                <FileSeal ext={ext} size={32} />
                <div className="min-w-0 flex-1">
                  <p
                    className="font-serif text-sm text-ink-brown truncate"
                    title={f.fileName}
                  >
                    {truncate(f.fileName, 50)}
                  </p>
                  <p className="font-sans text-[11px] text-sepia mt-0.5">
                    <span className="num-osf">{formatBytes(f.fileSize)}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(f.id)}
                  className="text-sepia hover:text-wax-red transition-colors"
                  aria-label="移除"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.2">
                    <path d="M2 2 L10 10 M10 2 L2 10" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EnvelopeIcon() {
  return (
    <svg width="40" height="32" viewBox="0 0 40 32" fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="36" height="24" />
      <path d="M2 4 L20 18 L38 4" />
      <path d="M2 28 L14 16" opacity="0.5" />
      <path d="M38 28 L26 16" opacity="0.5" />
    </svg>
  );
}
