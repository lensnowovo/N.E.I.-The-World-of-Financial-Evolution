import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-guard';

// PATCH /api/admin/reports/[id] —— 管理员处置举报（SEC-011 闭环）
// body: { action: 'closed' | 'dismissed' }
//  - closed    → 举报成立，已处理（如配合 SEC-007 reject/revoke 处置内容）
//  - dismissed → 举报被驳回（无效/误报）
// 状态从 'open' 切换到 closed/dismissed 后即从 /admin 举报队列移除
// 非 admin → 401/403（requireAdmin 守卫）；report 不存在 → 404
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: '参数错误' }, { status: 400 });

  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const data = await req.json().catch(() => ({}));
  const action = typeof data.action === 'string' ? data.action : '';

  if (action !== 'closed' && action !== 'dismissed') {
    return NextResponse.json({ error: '未知的处置动作（应为 closed 或 dismissed）' }, { status: 400 });
  }

  const report = await prisma.report.findUnique({ where: { id }, select: { id: true } });
  if (!report) {
    return NextResponse.json({ error: '举报不存在' }, { status: 404 });
  }

  const updated = await prisma.report.update({
    where: { id },
    data: { status: action },
    select: { id: true, status: true },
  });
  return NextResponse.json(updated);
}
