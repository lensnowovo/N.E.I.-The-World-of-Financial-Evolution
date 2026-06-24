import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-guard';

// PATCH /api/admin/posts/[id]/feature —— 管理员切换帖子精选标记
// body: { featured: boolean }；非管理员 → 403；未登录 → 401
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: '参数错误' }, { status: 400 });

  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const data = await req.json().catch(() => ({}));
  const featured = Boolean(data.featured);

  // 帖子不存在 → 404；已软删的帖子允许 toggle（管理员语义；公开查询本身会因
  // US-009 的 deletedAt:null 过滤而不展示，故无副作用 —— 即便被标为 featured
  // 也不会出现在首页 FeaturedWorkflows，见 US-015）
  const post = await prisma.post.findUnique({ where: { id }, select: { id: true } });
  if (!post) {
    return NextResponse.json({ error: '内容不存在' }, { status: 404 });
  }

  // 精选时排到末尾（max+1，新精选的出现在首页最后）；取消精选时归零
  let featuredOrder = 0;
  if (featured) {
    const agg = await prisma.post.aggregate({
      where: { featured: true },
      _max: { featuredOrder: true },
    });
    featuredOrder = (agg._max.featuredOrder ?? 0) + 1;
  }

  await prisma.post.update({ where: { id }, data: { featured, featuredOrder } });
  return NextResponse.json({ id, featured, featuredOrder });
}
