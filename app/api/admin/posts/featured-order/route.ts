import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRecentAdmin } from '@/lib/auth-guard';
import { writeAdminAudit } from '@/lib/admin-audit';

/**
 * PATCH /api/admin/posts/featured-order —— 管理员拖拽保存精选顺序
 *
 * body: { orderedIds: number[] }  // 按期望顺序排列的精选帖 id（从前到后）
 *
 * 把每条的 featuredOrder 设为其下标。只更新 featured=true 的帖子；
 * 非精选帖传入会被忽略，更新与审计日志在同一事务内提交。
 */
export async function PATCH(req: Request) {
  const guard = await requireRecentAdmin();
  if (guard instanceof NextResponse) return guard;

  const data = await req.json().catch(() => ({}));
  const orderedIds: unknown = data.orderedIds;
  if (!Array.isArray(orderedIds) || orderedIds.length === 0 || orderedIds.length > 100) {
    return NextResponse.json({ error: 'orderedIds 非空数组' }, { status: 400 });
  }

  const ids = [...new Set(orderedIds
    .map((x) => (typeof x === 'number' ? x : parseInt(String(x), 10)))
    .filter((x) => Number.isSafeInteger(x) && x > 0))];

  // 确认这些 id 当前都是 featured，避免误改非精选帖
  const featured = await prisma.post.findMany({
    where: { id: { in: ids }, featured: true },
    select: { id: true },
  });
  const featuredSet = new Set(featured.map((p) => p.id));

  const acceptedIds = ids.filter((id) => featuredSet.has(id));
  await prisma.$transaction(async (tx) => {
    await Promise.all(
      acceptedIds.map((id, idx) => tx.post.update({ where: { id }, data: { featuredOrder: idx + 1 } })),
    );
    await writeAdminAudit({
      actorUserId: guard.user.id,
      action: 'post.feature.reorder',
      entityType: 'featured-posts',
      entityId: 'home',
      afterState: { orderedIds: acceptedIds },
      request: req,
      client: tx,
    });
  });

  return NextResponse.json({ ok: true, count: featuredSet.size });
}
