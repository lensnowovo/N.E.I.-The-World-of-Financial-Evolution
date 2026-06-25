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
 * viewCount 自增带防刷：同 IP + post 5 分钟内只计一次。
 * （MVP 内存 Map，生产应换持久化——TODO）
 */

// 内存防刷：key = `${ip}:${postId}`，value = 过期时间戳
const VIEW_DEDUP = new Map<string, number>();
const VIEW_WINDOW_MS = 5 * 60 * 1000; // 5 分钟
// 定期清理过期项，避免内存无限增长（每 10 分钟清一次）
let lastCleanup = Date.now();

function shouldCountView(ip: string, postId: number): boolean {
  const now = Date.now();
  // 清理过期
  if (now - lastCleanup > 10 * 60 * 1000) {
    for (const [k, exp] of VIEW_DEDUP) {
      if (exp < now) VIEW_DEDUP.delete(k);
    }
    lastCleanup = now;
  }
  const key = `${ip}:${postId}`;
  const exp = VIEW_DEDUP.get(key);
  if (exp && exp > now) return false; // 窗口内已计过
  VIEW_DEDUP.set(key, now + VIEW_WINDOW_MS);
  return true;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  // viewCount 防刷自增（IP + post 5 分钟去重）
  const ip = getClientIp(req);
  if (shouldCountView(ip, id)) {
    // 不 await，不阻塞响应（容许偶尔丢失计数）
    void prisma.post.update({ where: { id }, data: { viewCount: { increment: 1 } } });
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

function getClientIp(req: Request): string {
  // 优先用标准转发头（生产部署在反向代理后），fallback 到连接信息
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

function safeJsonArray(raw: string | null): string[] {
  try {
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}
