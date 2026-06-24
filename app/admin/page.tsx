export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { AdminConsoleClient, type AdminPostItem } from './AdminConsoleClient';

// /admin —— 管理员内容控制台
// 鉴权：未登录 → /login?next=/admin；已登录非管理员 → /?error=forbidden
// （requireAdmin() 守卫是 API 路由专用返回 NextResponse 的形态；server page
//  用 redirect 表达同一语义，见 lib/auth-guard.ts 顶部注释）
export default async function AdminPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/admin');
  if (!me.isAdmin) redirect('/?error=forbidden');

  // 列出所有帖子（含软删），按 createdAt desc
  // 不加 deletedAt 过滤 —— 管理员需要看到软删的帖子以便审核/恢复
  const rows = await prisma.post.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      tagScene: true,
      featured: true,
      deletedAt: true,
      createdAt: true,
      author: { select: { id: true, nickname: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const items: AdminPostItem[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    tagScene: r.tagScene,
    featured: r.featured,
    deletedAt: r.deletedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    author: { id: r.author.id, nickname: r.author.nickname },
  }));

  const activeCount = items.filter((i) => !i.deletedAt).length;
  const deletedCount = items.length - activeCount;

  return (
    <div className="mx-auto max-w-page px-4 sm:px-6 py-8">
      <div className="mb-6 pb-5 border-b border-paper-edge">
        <Link href="/" className="inline-flex items-center gap-1.5 font-serif italic text-sm text-sepia hover:text-ink-brown mb-3">
          ← 返回首页
        </Link>
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="font-serif text-3xl text-ink-brown">管理员控制台</h1>
          <span className="font-mono text-sm text-sepia">
            {activeCount} 活跃 · {deletedCount} 已软删
          </span>
        </div>
        <p className="mt-2 font-sans text-xs text-leather">
          内容审核：软删除与精选管理。所有操作调用 US-011 的 DELETE 与 US-012 的 PATCH feature 接口。
        </p>
      </div>

      <AdminConsoleClient initialItems={items} adminId={me.id} />
    </div>
  );
}
