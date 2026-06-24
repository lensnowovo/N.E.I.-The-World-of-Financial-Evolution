import { redirect } from 'next/navigation';

type SP = { [k: string]: string | string[] | undefined };

/**
 * /search 已废弃 —— 搜索功能统一并入首页（顶栏搜索框跳 /?q=xxx）。
 *
 * 这里保留路由做重定向，把所有参数原样带到首页，防止旧链接/书签 404。
 * 之前检索页与首页定位重叠（都是搜索+筛选+内容），取消它更干净。
 */
export default async function SearchRedirect({ searchParams }: { searchParams: Promise<SP> }) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) {
    if (typeof v === 'string') u.set(k, v);
    else if (Array.isArray(v)) v.forEach((x) => u.append(k, x));
  }
  const qs = u.toString();
  redirect(qs ? `/?${qs}` : '/');
}
