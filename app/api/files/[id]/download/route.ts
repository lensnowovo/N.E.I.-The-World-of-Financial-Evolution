import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { readFileByKey } from '@/lib/storage';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  // 开放下载：不要求登录。看全文 + 下载 + 复制都免费，
  // 登录只留给「想说话/想贡献」的人（发帖/评论/点赞）。
  const id = parseInt((await params).id, 10);
  const att = await prisma.attachment.findUnique({ where: { id } });
  if (!att || !att.postId) {
    return NextResponse.json({ error: '文件不存在' }, { status: 404 });
  }

  let buf: Buffer;
  try {
    buf = await readFileByKey(att.storageKey);
  } catch {
    return NextResponse.json({ error: '文件已丢失' }, { status: 410 });
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
    },
  });
}
