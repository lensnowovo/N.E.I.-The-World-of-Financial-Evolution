'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import {
  buildConnectorSetupPrompt,
  type McpLibraryItem,
} from '@/lib/mcp-library';

export function McpFeaturedCard({ item }: { item: McpLibraryItem }) {
  if (item.internal) {
    return (
      <Link
        href="/connect"
        className="group block h-full rounded-lg border border-paper-edge bg-vellum p-4 text-left transition-all hover:-translate-y-0.5 hover:border-sepia hover:shadow-card focus:outline-none focus:ring-2 focus:ring-gilded/35"
        aria-label="前往 N.E.I. MCP 连接页"
      >
        <FeaturedCardBody item={item} actionText="点击前往 MCP 连接页 →" />
      </Link>
    );
  }

  return <CopyFeaturedCard item={item} />;
}

function CopyFeaturedCard({ item }: { item: McpLibraryItem }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyText(buildConnectorSetupPrompt(item));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'group block h-full rounded-lg border border-paper-edge bg-vellum p-4 text-left transition-all hover:-translate-y-0.5 hover:border-sepia hover:shadow-card focus:outline-none focus:ring-2 focus:ring-gilded/35',
        copied && 'border-moss/45 bg-moss/5',
      )}
      aria-label={`复制 ${item.name} 的接入 Prompt`}
    >
      <FeaturedCardBody
        item={item}
        actionText={copied ? '✓ 接入 Prompt 已复制' : '点击卡片复制接入 Prompt'}
        copied={copied}
      />
    </button>
  );
}

function FeaturedCardBody({
  item,
  actionText,
  copied = false,
}: {
  item: McpLibraryItem;
  actionText: string;
  copied?: boolean;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gilded">
            {item.kind}
          </p>
          <h3 className="mt-1 font-serif text-lg text-ink-brown transition-colors group-hover:text-wax-red">
            {item.name}
          </h3>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <p className="mt-2 font-sans text-xs leading-5 text-leather">
        {item.highlight}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {item.bestFor.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-paper-edge bg-parchment px-2 py-0.5 font-sans text-[11px] text-sepia"
          >
            {tag}
          </span>
        ))}
      </div>
      <p
        className={cn(
          'mt-4 font-serif italic text-xs transition-colors',
          copied ? 'text-moss' : 'text-sepia group-hover:text-ink-brown',
        )}
      >
        {actionText}
      </p>
    </>
  );
}

function StatusBadge({ status }: { status: McpLibraryItem['status'] }) {
  const cls =
    status === '推荐试用'
      ? 'border-moss/35 bg-moss/10 text-moss'
      : status === '适合自建'
        ? 'border-gilded/45 bg-gilded/10 text-gilded'
        : status === '需订阅验证'
          ? 'border-wax-red/30 bg-wax-red/10 text-wax-red'
          : 'border-sepia/30 bg-sepia/10 text-sepia';

  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 font-sans text-[11px] ${cls}`}>
      {status}
    </span>
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
