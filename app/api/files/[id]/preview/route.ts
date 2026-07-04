import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db';
import { readFileByKey } from '@/lib/storage';
import { POST_STATUS } from '@/lib/status';

const MAX_PREVIEW_BYTES = 160 * 1024;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: '文件不存在' }, { status: 404 });
  }

  const att = await prisma.attachment.findUnique({
    where: { id },
    include: {
      post: {
        select: {
          title: true,
          body: true,
          status: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!att || !att.postId || !att.post || att.post.status !== POST_STATUS.PUBLISHED || att.post.deletedAt) {
    return NextResponse.json({ error: '文件不存在' }, { status: 404 });
  }

  if (!/\.(md|markdown|txt)$/i.test(att.fileName)) {
    return NextResponse.json({ error: '该文件不支持预览' }, { status: 415 });
  }

  let buf: Buffer;
  try {
    buf = await readFileFromCache(att.storageKey);
  } catch {
    try {
      buf = await readFileByKey(att.storageKey);
    } catch {
      const generated = buildMarkdownFallback(att.fileName, att.post.title, att.post.body);
      if (!generated) {
        return NextResponse.json({ error: '文件已丢失' }, { status: 410 });
      }
      buf = generated;
    }
  }

  const truncated = buf.length > MAX_PREVIEW_BYTES;
  const preview = buf.subarray(0, MAX_PREVIEW_BYTES).toString('utf8');

  return NextResponse.json({
    fileName: att.fileName,
    text: preview,
    chars: preview.length,
    truncated,
  });
}

async function readFileFromCache(key: string): Promise<Buffer> {
  const safe = path.basename(key);
  return fs.readFile(path.join(process.cwd(), 'public', 'file-cache', safe));
}

function buildMarkdownFallback(fileName: string, title: string, bodyHtml: string): Buffer | null {
  if (!/\.(md|markdown|txt)$/i.test(fileName)) return null;

  const text = htmlToText(bodyHtml);
  if (!text) return null;

  return Buffer.from(`# ${title}\n\n${text}\n`, 'utf8');
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h1|h2|h3|blockquote|pre)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
