import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-guard';
import { POST_STATUS } from '@/lib/status';

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

  // 帖子不存在 → 404；已软删的帖子也允许管理员审核动作（若未来恢复内容时状态直接就绪）
  const post = await prisma.post.findUnique({ where: { id }, select: { id: true } });
  if (!post) {
    return NextResponse.json({ error: '内容不存在' }, { status: 404 });
  }

  const updated = await prisma.post.update({
    where: { id },
    data: updateData,
    select: { id: true, status: true, mcpApproved: true, reviewFlag: true },
  });
  return NextResponse.json(updated);
}
