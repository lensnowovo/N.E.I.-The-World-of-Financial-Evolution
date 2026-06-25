import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUid } from '@/lib/session';
import { POST_STATUS } from '@/lib/status';
import { withMetrics } from '@/lib/metrics';

// POST /api/reports —— 登录用户举报一篇 post（SEC-011 社区监督闭环）
// body: { postId: number, reason: string }
//  - 必须 登录（getSessionUid）→ 否则 401
//  - postId 必须是已发布且未软删的 post → 否则 404
//  - reason trim 后 5-1000 字 → 否则 400
//  - 创建 Report(status='open')，201 返回 { id, status }
// 同一用户对同一 post 重复举报不做硬约束（允许追加补充理由），管理员在 /admin 看到所有 open 举报
export const POST = withMetrics('POST /api/reports', createReport);

async function createReport(req: Request) {
  const uid = await getSessionUid();
  if (!uid) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const data = await req.json().catch(() => ({}));
  const postId = typeof data.postId === 'number' ? data.postId : parseInt(data.postId, 10);
  const reason = typeof data.reason === 'string' ? data.reason.trim() : '';

  if (!Number.isInteger(postId) || postId <= 0) {
    return NextResponse.json({ error: '参数错误' }, { status: 400 });
  }
  if (reason.length < 5 || reason.length > 1000) {
    return NextResponse.json({ error: '举报理由需 5-1000 字' }, { status: 400 });
  }

  // 仅允许举报已发布且未软删的 post —— 草稿/已拒/软删的 post 不可被举报
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true, deletedAt: true },
  });
  if (!post || post.deletedAt || post.status !== POST_STATUS.PUBLISHED) {
    return NextResponse.json({ error: '内容不存在或不可举报' }, { status: 404 });
  }

  const report = await prisma.report.create({
    data: {
      reporterId: uid,
      postId,
      reason,
      status: 'open',
    },
    select: { id: true, status: true },
  });

  return NextResponse.json(report, { status: 201 });
}
