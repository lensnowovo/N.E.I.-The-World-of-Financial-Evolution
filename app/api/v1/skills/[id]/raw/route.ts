import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { POST_STATUS } from '@/lib/status';
import { normalizePublicText } from '@/lib/public-url';

/**
 * GET /api/v1/skills/:id/raw —— 取 Skill 原文
 *
 * 方便 AI / 工具直接拿到干净的原文，不用解析 HTML：
 * - prompt 帖：返回纯文本（剥 HTML，优先 <pre> 内容），Content-Type: text/plain
 * - 有附件的帖（SKILL.md / 文件）：302 重定向到 /api/files/{首附件}/download
 *
 * 这样调用方一个端点就能拿到「这个 skill 的原始可用内容」。
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: '无效的 id' }, { status: 400 });
  }

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      attachments: { orderBy: { createdAt: 'asc' }, take: 1 },
      skillAsset: { select: { assetType: true } },
    },
  });
  if (!post || post.status !== POST_STATUS.PUBLISHED || post.deletedAt) {
    return NextResponse.json({ error: '内容不存在或未发布' }, { status: 404 });
  }

  const base = new URL(req.url).origin;

  // 有附件 → 重定向到文件下载（SKILL.md 等文件型 skill）
  const firstAtt = post.attachments.find((a) => a.postId !== null);
  if (firstAtt) {
    return NextResponse.redirect(`${base}/api/files/${firstAtt.id}/download`, { status: 302 });
  }

  // 无附件 → 返回正文纯文本（prompt 帖，优先 <pre>）
  const raw = normalizePublicText(extractPlainText(post.body));
  return new NextResponse(raw, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `inline; filename="skill-${id}.txt"`,
      'Cache-Control': 'public, max-age=60',
    },
  });
}

/** 从 body HTML 提取纯文本，优先 <pre>（prompt 帖正文结构是「介绍 + <pre>Prompt</pre>」） */
function extractPlainText(bodyHtml: string): string {
  const preMatch = bodyHtml.match(/<pre[\s\S]*?>([\s\S]*?)<\/pre>/i);
  const raw = preMatch ? preMatch[1] : bodyHtml;
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&hellip;/g, '…')
    .trim();
}
