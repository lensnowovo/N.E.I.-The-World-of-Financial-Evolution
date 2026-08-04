import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { stripHtml } from '@/lib/validate';
import { POST_STATUS } from '@/lib/status';
import type { ApiSkillDetail, ApiAttachment, SingleResponse } from '@/lib/types';
import { normalizePublicText, normalizePublicUrl } from '@/lib/public-url';

/**
 * GET /api/v1/skills/:id —— 公开只读详情 API
 *
 * 返回完整 body、attachments（剥掉 storageKey/uploaderId，带 downloadUrl）、skillAsset 全字段。
 * 去掉用户态（liked/favorited）。
 *
 * 公开读取路径保持只读。浏览量由网页端 /api/activity 在限流、去重后统一记录。
 */

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: '无效的 id' }, { status: 400 });
  }

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, nickname: true, role: true, avatarUrl: true } },
      attachments: { orderBy: { createdAt: 'asc' } },
      skillAsset: true,
      _count: { select: { comments: true, stars: true,  } },
    },
  });
  if (!post || post.status !== POST_STATUS.PUBLISHED || post.deletedAt) {
    return NextResponse.json({ error: '内容不存在或未发布' }, { status: 404 });
  }

  const attachments: ApiAttachment[] = post.attachments
    .filter((a) => a.postId !== null) // 未关联帖子的附件不暴露
    .map((a) => ({
      id: a.id,
      fileName: a.fileName,
      fileSize: a.fileSize,
      mimeType: a.mimeType,
      downloadCount: a.downloadCount,
      createdAt: a.createdAt.toISOString(),
      downloadUrl: `/api/files/${a.id}/download`,
    }));

  const data: ApiSkillDetail = {
    id: post.id,
    title: post.title,
    body: normalizePublicText(post.body),
    excerpt: stripHtml(normalizePublicText(post.body)).slice(0, 200),
    tagScene: post.tagScene,
    tagIndustry: post.tagIndustry,
    tagContent: safeJsonArray(post.tagContent),
    tagSkill: post.tagSkill,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    viewCount: post.viewCount,
    author: post.author,
    counts: {
      comments: post._count.comments,
      stars: post._count.stars,
    },
    skillAsset: post.skillAsset
      ? {
          id: post.skillAsset.id,
          assetType: post.skillAsset.assetType,
          sourceUrl: normalizePublicUrl(post.skillAsset.sourceUrl),
          originalAuthor: post.skillAsset.originalAuthor,
          installHint: post.skillAsset.installHint ? normalizePublicText(post.skillAsset.installHint) : null,
          usageNotes: post.skillAsset.usageNotes ? normalizePublicText(post.skillAsset.usageNotes) : null,
        }
      : null,
    attachments,
  };

  const body: SingleResponse<ApiSkillDetail> = { data };
  return NextResponse.json(body);
}

function safeJsonArray(raw: string | null): string[] {
  try {
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}
