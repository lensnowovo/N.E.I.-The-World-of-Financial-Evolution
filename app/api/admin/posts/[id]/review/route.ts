import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-guard';
import { POST_STATUS } from '@/lib/status';
import { readCanonicalSkillContent } from '@/lib/canonical-skill-content';
import { extractPlainText, extractReadableText } from '@/lib/skill-text';
import { normalizePublicText } from '@/lib/public-url';
import { signSkillRevision } from '@/lib/skill-integrity';
import { writeAdminAudit } from '@/lib/admin-audit';

// PATCH /api/admin/posts/[id]/review —— 管理员审核动作（MCP 准入闭环）
// body: { action: 'approve' | 'reject' | 'revoke' }
//  - approve → mcpApproved=true + status=published + 清 reviewFlag（SEC-003 即刻放行进入 MCP）
//  - reject  → status=rejected（公开视图下架；mcpApproved 保持现状，通常本就是 false）
//  - revoke  → mcpApproved=false（撤回 MCP 准入；SEC-003 立即把它从 MCP 返回过滤掉）
// 非 admin → 401/403（requireAdmin 守卫）；post 不存在 → 404
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: '参数错误' }, { status: 400 });

  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const data = await req.json().catch(() => ({}));
  const action = typeof data.action === 'string' ? data.action : '';
  const reason = typeof data.reason === 'string' ? data.reason.trim().slice(0, 500) : '';

  let updateData: Record<string, unknown>;
  if (action === 'approve') {
    updateData = {
      mcpApproved: true,
      status: POST_STATUS.PUBLISHED,
      reviewFlag: null,
    };
  } else if (action === 'reject') {
    updateData = {
      status: POST_STATUS.REJECTED,
    };
  } else if (action === 'revoke') {
    updateData = {
      mcpApproved: false,
    };
  } else {
    return NextResponse.json({ error: '未知的审核动作' }, { status: 400 });
  }

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      skillAsset: { select: { assetType: true } },
      attachments: {
        orderBy: { createdAt: 'asc' },
        select: { fileName: true, mimeType: true, storageKey: true },
      },
    },
  });
  if (!post) {
    return NextResponse.json({ error: '内容不存在' }, { status: 404 });
  }

  let signedSnapshot:
    | { title: string; content: string; contentHash: string; signature: string; version: number }
    | null = null;
  if (action === 'approve') {
    const fallback = normalizePublicText(
      post.skillAsset?.assetType === 'agent-discipline'
        ? extractReadableText(post.body)
        : extractPlainText(post.body),
    );
    let content: string;
    try {
      content = normalizePublicText(await readCanonicalSkillContent(post.attachments, fallback));
    } catch (error) {
      console.error('[SEC] canonical Skill snapshot failed:', error);
      return NextResponse.json(
        { error: 'Skill 原文当前不可读取，已阻止批准。请先修复附件。' },
        { status: 409 },
      );
    }
    try {
      const signed = signSkillRevision({
        postId: post.id,
        version: post.version,
        title: post.title,
        content,
      });
      signedSnapshot = { title: post.title, content, version: post.version, ...signed };
    } catch (error) {
      console.error('[SEC] Skill snapshot signing unavailable:', error);
      return NextResponse.json(
        { error: '内容完整性签名未配置，已阻止批准。' },
        { status: 503 },
      );
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.post.findUnique({
      where: { id },
      select: { id: true, title: true, version: true, status: true, mcpApproved: true, reviewFlag: true },
    });
    if (!current) throw new Error('POST_NOT_FOUND');
    if (signedSnapshot && (current.version !== signedSnapshot.version || current.title !== signedSnapshot.title)) {
      throw new Error('POST_CHANGED_DURING_REVIEW');
    }

    if (signedSnapshot) {
      const existing = await tx.skillRevision.findUnique({
        where: { postId_version: { postId: id, version: signedSnapshot.version } },
      });
      if (existing && (
        existing.contentHash !== signedSnapshot.contentHash ||
        existing.signature !== signedSnapshot.signature ||
        existing.content !== signedSnapshot.content
      )) {
        throw new Error('IMMUTABLE_REVISION_CONFLICT');
      }
      await tx.skillRevision.updateMany({
        where: { postId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (existing) {
        await tx.skillRevision.update({ where: { id: existing.id }, data: { revokedAt: null } });
      } else {
        await tx.skillRevision.create({
          data: {
            postId: id,
            version: signedSnapshot.version,
            title: signedSnapshot.title,
            content: signedSnapshot.content,
            contentHash: signedSnapshot.contentHash,
            signature: signedSnapshot.signature,
            approvedById: guard.user.id,
          },
        });
      }
    } else if (action === 'revoke' || action === 'reject') {
      await tx.skillRevision.updateMany({
        where: { postId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    const result = await tx.post.update({
      where: { id },
      data: updateData,
      select: { id: true, status: true, mcpApproved: true, reviewFlag: true, version: true },
    });
    await writeAdminAudit({
      actorUserId: guard.user.id,
      action: `post.review.${action}`,
      entityType: 'post',
      entityId: id,
      reason,
      beforeState: current,
      afterState: result,
      request: req,
      client: tx,
    });
    return result;
  }).catch((error: unknown) => {
    const code = error instanceof Error ? error.message : '';
    if (code === 'POST_CHANGED_DURING_REVIEW') return null;
    if (code === 'IMMUTABLE_REVISION_CONFLICT') return false;
    throw error;
  });

  if (updated === null) {
    return NextResponse.json({ error: '审核期间内容已变化，请刷新后重新审核。' }, { status: 409 });
  }
  if (updated === false) {
    return NextResponse.json({ error: '同一版本的审核快照发生冲突，已阻止覆盖。' }, { status: 409 });
  }
  return NextResponse.json(updated);
}
