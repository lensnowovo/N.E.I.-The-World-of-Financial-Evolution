import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db';
import { readFileByKey } from '@/lib/storage';
import { POST_STATUS } from '@/lib/status';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseInt((await params).id, 10);
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

  let buf: Buffer;
  let source: 'static-cache' | 'object-storage' | 'generated-fallback' = 'object-storage';

  try {
    // Public curated markdown files are small and stable. Prefer the deployed
    // static cache so launch content does not depend on object storage.
    buf = await readFileFromCache(att.storageKey);
    source = 'static-cache';
  } catch {
    try {
      buf = await readFileByKey(att.storageKey);
      source = 'object-storage';
    } catch {
      const generated = buildMarkdownFallback(att.fileName, att.post.title, att.post.body);
      if (!generated) {
        return NextResponse.json({ error: '文件已丢失' }, { status: 410 });
      }
      buf = generated;
      source = 'generated-fallback';
    }
  }

  await prisma.attachment.update({
    where: { id },
    data: { downloadCount: { increment: 1 } },
  });

  // RFC 5987 编码非 ASCII 文件名
  const ascii = att.fileName.replace(/[^\x20-\x7e]/g, '_');
  const utf8 = encodeURIComponent(att.fileName);

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': att.mimeType || 'application/octet-stream',
      'Content-Length': String(buf.length),
      'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`,
      'X-NEI-File-Source': source,
    },
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
