import { NextResponse } from 'next/server';
import { getCurrentUser, type SessionUser } from './session';
import { getRecentAdminAuth } from './admin-reauth';

/**
 * 管理员守卫（API 路由用）。
 *
 * 调用方用法：
 *   const guard = await requireAdmin();
 *   if (guard instanceof NextResponse) return guard;
 *   // 此后 guard.user 一定是 admin
 *
 * 语义：
 * - 未登录 → 401（与项目其他写接口一致；同时也不会泄露「此管理员端点存在」）
 * - 已登录但非管理员 → 403
 * - 管理员 → 返回 { user: SessionUser }
 *
 * isAdmin 来自 getCurrentUser 的 select（US-008 起 select 已含 isAdmin），
 * 守卫本身不查 DB，仅做布尔判断。
 */
export async function requireAdmin(): Promise<{ user: SessionUser } | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  if (!user.isAdmin) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
  }
  return { user };
}

/**
 * 高风险管理员写操作守卫。
 *
 * 管理员的普通登录最长可维持 30 天，但审批、下架、精选、授权等操作必须在最近
 * 15 分钟内重新验证密码。428 让前端可以明确区分“需二次验证”和普通 401/403。
 */
export async function requireRecentAdmin(): Promise<{ user: SessionUser } | NextResponse> {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const auth = await getRecentAdminAuth(guard.user.id);
  if (!auth.recent) {
    return NextResponse.json(
      { error: '敏感操作前请重新验证管理员身份', code: 'ADMIN_REAUTH_REQUIRED' },
      { status: 428 },
    );
  }
  return guard;
}
