'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import {
  buildConnectorSetupPrompt,
  type McpLibraryItem,
} from '@/lib/mcp-library';

/**
 * MCP 库页的连接器操作按钮组。
 *
 * 三种按钮组合：
 * 1. internal (nei-pevc)：跳 /connect 生成自己的接入 Prompt
 * 2. 外部连接器：复制接入 Prompt + 项目链接 + N.E.I. 说明
 * 3. 无 url：只显示 N.E.I. 说明
 */
export function McpLibraryActions({
  item,
  compact = false,
}: {
  item: McpLibraryItem;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = buildConnectorSetupPrompt(item);
    await copyText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className={cn(compact ? 'mt-3' : '', 'flex flex-wrap items-center gap-2')}>
      {item.internal ? (
        <Link
          href="/connect"
          className="inline-flex h-8 items-center rounded-sm bg-wax-red px-3 font-serif text-xs text-vellum transition-colors hover:bg-ink-brown"
        >
          去 /connect 生成我的接入 Prompt →
        </Link>
      ) : (
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'inline-flex h-8 items-center rounded-sm px-3 font-serif text-xs transition-colors',
            copied
              ? 'border border-moss/50 bg-moss/10 text-moss'
              : 'bg-ink-brown text-vellum hover:bg-wax-red',
          )}
        >
          {copied ? '✓ 已复制' : '复制接入 Prompt'}
        </button>
      )}

      {item.url && !item.internal && (
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center rounded-sm border border-paper-edge bg-vellum px-3 font-serif text-xs text-leather transition-colors hover:border-sepia hover:text-ink-brown"
        >
          项目链接 ↗
        </a>
      )}

      {item.sourcePostId && (
        <Link
          href={`/posts/${item.sourcePostId}`}
          className="inline-flex h-8 items-center rounded-sm border border-paper-edge bg-vellum px-3 font-serif text-xs text-leather transition-colors hover:border-sepia hover:text-ink-brown"
        >
          N.E.I. 说明
        </Link>
      )}
    </div>
  );
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}
