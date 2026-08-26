import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, getSessionUid } from '@/lib/session';
import { sanitizeHtml } from '@/lib/validate';
import { SCENE_TAGS, INDUSTRY_TAGS, CONTENT_TAGS, SKILL_TAGS } from '@/lib/tags';
import { canEditPost } from '@/lib/post-auth';
import { withMetrics } from '@/lib/metrics';
import { POST_STATUS } from '@/lib/status';
import { writeAdminAudit } from '@/lib/admin-audit';
import { requireRecentAdmin } from '@/lib/auth-guard';
import { CONTRIBUTIONS_DISABLED_MESSAGE, PUBLIC_CONTRIBUTIONS_ENABLED } from '@/lib/community-features';

const sceneVals: string[] = SCENE_TAGS.map((t) => t.value);
const industryVals: string[] = INDUSTRY_TAGS.map((t) => t.value);
const contentVals: string[] = CONTENT_TAGS.map((t) => t.value);
const skillVals: string[] = SKILL_TAGS.map((t) => t.value);

export const GET = withMetrics('GET /api/posts/[id]', getPost);

async function getPost(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: '参数错误' }, { status: 400 });

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, nickname: true, role: true, avatarUrl: true } },
      attachments: true,
      _count: { select: { comments: true, stars: true } },
    },
  });
  if (!post || post.status !== 'published' || post.deletedAt) {
    return NextResponse.json({ error: '内容不存在或未发布' }, { status: 404 });
  }

  const uid = await getSessionUid();
  let starred = false;
  if (uid) {
    const star = await prisma.postFavorite.findUnique({ where: { userId_postId: { userId: uid, postId: id } } });
    starred = !!star;
  }

  const { attachments, ...publicPost } = post;
  return NextResponse.json({
    ...publicPost,
    attachments: attachments.map(({ id: attachmentId, fileName, fileSize, mimeType, createdAt }) => ({
      id: attachmentId,
      fileName,
      fileSize,
      mimeType,
      createdAt,
    })),
    tagContent: JSON.parse(post.tagContent || '[]'),
    starred,
  });
}

// PATCH /api/posts/[id] —— 编辑（作者本人或管理员）
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: '参数错误' }, { status: 400 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  if (!PUBLIC_CONTRIBUTIONS_ENABLED && !user.isAdmin) {
    return NextResponse.json({ error: CONTRIBUTIONS_DISABLED_MESSAGE }, { status: 403 });
  }

  // 取 post（不早返回 deletedAt，单独判定 → 软删后 PATCH 返回 404）
  const post = await prisma.post.findUnique({
    where: { id },
    select: { id: true, userId: true, deletedAt: true, status: true, version: true, mcpApproved: true },
  });
  if (!post || post.deletedAt) {
    return NextResponse.json({ error: '内容不存在或已删除' }, { status: 404 });
  }
  if (!canEditPost(user.id, post, user.isAdmin)) {
    return NextResponse.json({ error: '无权编辑此帖子' }, { status: 403 });
  }
  if (user.isAdmin && user.id !== post.userId) {
    const recent = await requireRecentAdmin();
    if (recent instanceof NextResponse) return recent;
  }

  const data = await req.json();
  const title = String(data.title || '').trim();
  const body = String(data.body || '').trim();
  const tagScene = String(data.tagScene || '');
  const tagIndustry = data.tagIndustry ? String(data.tagIndustry) : null;
  const tagContentArr: string[] = Array.isArray(data.tagContent) ? data.tagContent.filter(Boolean) : [];
  const tagSkill = data.tagSkill ? String(data.tagSkill) : null;

  // 复用 POST /api/posts 的校验规则
  if (title.length < 5 || title.length > 100) {
    return NextResponse.json({ error: '标题需 5-100 字符' }, { status: 400 });
  }
  if (body.length < 1 || body.length > 50000) {
    return NextResponse.json({ error: '正文长度需 1-50000 字符' }, { status: 400 });
  }
  if (!sceneVals.includes(tagScene)) {
    return NextResponse.json({ error: '请选择工作场景标签' }, { status: 400 });
  }
  if (tagIndustry && !industryVals.includes(tagIndustry)) {
    return NextResponse.json({ error: '行业标签无效' }, { status: 400 });
  }
  if (tagSkill && !skillVals.includes(tagSkill)) {
    return NextResponse.json({ error: 'Skill 标签无效' }, { status: 400 });
  }
  if (tagContentArr.length > 3) {
    return NextResponse.json({ error: '工作内容标签最多 3 个' }, { status: 400 });
  }
  const cleanContent = tagContentArr.filter((c) => contentVals.includes(c));

  // 所有已发布内容（包括管理员编辑）都必须重新审核。管理员账号被盗时，单次 PATCH
  // 不得直接把恶意正文暴露在网站或 MCP；审核是独立、可审计的第二个动作。
  await prisma.$transaction(async (tx) => {
    const updated = await tx.post.update({
      where: { id },
      data: {
        title,
        body: sanitizeHtml(body),
        tagScene,
        tagIndustry,
        tagContent: JSON.stringify(cleanContent),
        tagSkill,
        status: post.status === POST_STATUS.PUBLISHED ? POST_STATUS.PENDING : post.status,
        version: { increment: 1 },
        mcpApproved: false,
        reviewFlag: 'edited: pending re-review',
      },
      select: { id: true, status: true, version: true, mcpApproved: true, reviewFlag: true },
    });
    await tx.skillRevision.updateMany({
      where: { postId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (user.isAdmin) {
      await writeAdminAudit({
        actorUserId: user.id,
        action: 'post.edit',
        entityType: 'post',
        entityId: id,
        beforeState: {
          status: post.status,
          version: post.version,
          mcpApproved: post.mcpApproved,
        },
        afterState: updated,
        request: req,
        client: tx,
      });
    }
  });

  return NextResponse.json({ id });
}

// DELETE /api/posts/[id] —— 软删除（作者本人或管理员）
// 软删 = 设置 deletedAt = now；comments/favorites 不级联（保留以便恢复）
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: '参数错误' }, { status: 400 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  // 取 post —— 已软删或不存在的都返回 404（防重复删，与 PATCH 语义一致）
  const post = await prisma.post.findUnique({
    where: { id },
    select: { id: true, userId: true, deletedAt: true, status: true, version: true, mcpApproved: true },
  });
  if (!post || post.deletedAt) {
    return NextResponse.json({ error: '内容不存在或已删除' }, { status: 404 });
  }
  if (!canEditPost(user.id, post, user.isAdmin)) {
    return NextResponse.json({ error: '无权删除此帖子' }, { status: 403 });
  }
  if (user.isAdmin && user.id !== post.userId) {
    const recent = await requireRecentAdmin();
    if (recent instanceof NextResponse) return recent;
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.post.update({
      where: { id },
      data: { deletedAt: new Date(), mcpApproved: false },
      select: { id: true, deletedAt: true, mcpApproved: true },
    });
    await tx.skillRevision.updateMany({
      where: { postId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (user.isAdmin) {
      await writeAdminAudit({
        actorUserId: user.id,
        action: 'post.delete',
        entityType: 'post',
        entityId: id,
        beforeState: {
          status: post.status,
          version: post.version,
          mcpApproved: post.mcpApproved,
        },
        afterState: updated,
        request: _req,
        client: tx,
      });
    }
  });

  return NextResponse.json({ id });
}
