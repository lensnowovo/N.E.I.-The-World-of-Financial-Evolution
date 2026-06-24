import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-guard';

/**
 * PATCH /api/admin/posts/featured-order —— 管理员拖拽保存精选顺序
 *
 * body: { orderedIds: number[] }  // 按期望顺序排列的精选帖 id（从前到后）
 *
 * 把每条的 featuredOrder 设为其下标。只更新 featured=true 的帖子；
 * 非精选帖传入会被忽略。批量用单条 update（精选数量少，无需事务）。
 */
export async function PATCH(req: Request) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const data = await req.json().catch(() => ({}));
  const orderedIds: unknown = data.orderedIds;
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json({ error: 'orderedIds 非空数组' }, { status: 400 });
  }

  const ids = orderedIds
    .map((x) => (typeof x === 'number' ? x : parseInt(String(x), 10)))
    .filter((x) => Number.isFinite(x));

  // 确认这些 id 当前都是 featured，避免误改非精选帖
  const featured = await prisma.post.findMany({
    where: { id: { in: ids }, featured: true },
    select: { id: true },
  });
  const featuredSet = new Set(featured.map((p) => p.id));

  await Promise.all(
    ids.map((id, idx) =>
      featuredSet.has(id) ? prisma.post.update({ where: { id }, data: { featuredOrder: idx + 1 } }) : Promise.resolve(),
    ),
  );

  return NextResponse.json({ ok: true, count: featuredSet.size });
}
