'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Phase = 'params' | 'executing' | 'done' | 'error';

/**
 * Skill 执行弹窗。
 *
 * 打开时自动从 /api/v1/skills/:id/raw 拿 prompt 纯文本，
 * 提取 [填入xxx] / [xxx] 占位符生成输入框。
 * 用户填完点「执行」，POST /api/skills/:id/execute（SSE 流式）。
 */
export function ExecuteDialog({
  postId,
  onClose,
}: {
  postId: number;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('params');
  const [placeholders, setPlaceholders] = useState<{ raw: string; label: string }[]>([]);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [output, setOutput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [promptText, setPromptText] = useState('');

  // 拿 prompt 原文 + 提取占位符
  useEffect(() => {
    fetch(`/api/v1/skills/${postId}/raw`)
      .then((r) => (r.ok ? r.text() : null))
      .then((text) => {
        if (!text) return;
        setPromptText(text);
        // 提取占位符：[填入xxx] 或 [xxx]（2-40 字符）
        const matches = text.matchAll(/\[(填入[^\]]*|[^\]]{2,40})\]/g);
        const seen = new Set<string>();
        const phs: { raw: string; label: string }[] = [];
        for (const m of matches) {
          const raw = m[0]; // 完整 [xxx]
          if (seen.has(raw)) continue;
          seen.add(raw);
          // 生成友好 label
          let label = m[1];
          if (label.startsWith('填入')) label = label.slice(2);
          phs.push({ raw, label });
        }
        setPlaceholders(phs);
      });
  }, [postId]);

  const execute = useCallback(async () => {
    setPhase('executing');
    setOutput('');
    setErrorMsg('');

    try {
      const res = await fetch(`/api/skills/${postId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params: paramValues }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error || '执行失败');
        setPhase('error');
        return;
      }

      // 读取 SSE 流
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (!reader) {
        setErrorMsg('无法读取响应流');
        setPhase('error');
        return;
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // 解析 SSE（按 \n\n 分割）
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // 最后一段可能不完整

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') {
            setPhase('done');
            return;
          }
          try {
            const data = JSON.parse(json);
            if (data.text) {
              setOutput((prev) => prev + data.text);
            }
            if (data.error) {
              setErrorMsg(data.error);
              setPhase('error');
              return;
            }
          } catch {
            // ignore parse errors
          }
        }
      }
      setPhase('done');
    } catch {
      setErrorMsg('网络错误，请重试');
      setPhase('error');
    }
  }, [postId, paramValues]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-brown/60 backdrop-blur-sm">
      <div className="bg-vellum rounded-lg border border-paper-edge shadow-lg max-w-3xl w-full max-h-[85vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-paper-edge">
          <h3 className="font-serif text-lg text-ink-brown">
            {phase === 'executing' ? '执行中…' : phase === 'done' ? '执行完成' : phase === 'error' ? '执行失败' : '执行 Skill'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sepia hover:text-wax-red text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {phase === 'params' && (
            <div className="space-y-4">
              {placeholders.length > 0 ? (
                <>
                  <p className="font-sans text-sm text-sepia">填入参数后点击执行：</p>
                  {placeholders.map((p) => (
                    <div key={p.raw}>
                      <label className="block font-serif text-sm text-ink-brown mb-1">
                        {p.label}
                      </label>
                      <Input
                        value={paramValues[p.raw] || ''}
                        onChange={(e) =>
                          setParamValues((prev) => ({ ...prev, [p.raw]: e.target.value }))
                        }
                        placeholder={p.label}
                      />
                    </div>
                  ))}
                </>
              ) : (
                <p className="font-sans text-sm text-sepia">
                  这个 Skill 没有需要填的参数，点击执行即可。
                </p>
              )}
            </div>
          )}

          {(phase === 'executing' || phase === 'done' || phase === 'error') && (
            <div>
              {phase === 'executing' && (
                <div className="flex items-center gap-2 mb-3 text-sm text-gilded">
                  <span className="inline-block w-2 h-2 rounded-full bg-gilded animate-pulse" />
                  AI 正在生成…
                </div>
              )}
              {phase === 'error' && (
                <div className="mb-3 p-3 border border-wax-red/40 bg-wax-red/5 rounded text-sm text-wax-red">
                  {errorMsg}
                </div>
              )}
              <pre className="font-sans text-sm text-ink-brown whitespace-pre-wrap leading-relaxed bg-parchment/50 p-4 rounded min-h-[200px]">
                {output || '（等待输出…）'}
              </pre>
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center gap-3 px-5 py-3 border-t border-paper-edge">
          {phase === 'params' && (
            <>
              <Button type="button" variant="secondary" onClick={onClose}>取消</Button>
              <Button type="button" onClick={execute}>执行</Button>
            </>
          )}
          {phase === 'executing' && (
            <span className="font-serif italic text-sm text-sepia">请等待 AI 完成…</span>
          )}
          {phase === 'done' && (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(output);
                }}
              >
                复制结果
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setOutput('');
                  setPhase('params');
                }}
              >
                重新执行
              </Button>
            </>
          )}
          {phase === 'error' && (
            <>
              <Button type="button" variant="secondary" onClick={onClose}>关闭</Button>
              <Button
                type="button"
                onClick={() => {
                  setOutput('');
                  setPhase('params');
                }}
              >
                重试
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
