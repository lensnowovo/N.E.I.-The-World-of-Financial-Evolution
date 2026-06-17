import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 只对公开只读 API（/api/v1/）注入 CORS 头，让别的网站 / 工具 / AI 能跨域调用。
 *
 * 内部接口（/api/posts 等）不受影响——它们只服务前端同源调用，不需要 CORS。
 *
 * 只读 API 免 key、内容本就公开，CORS 开放为 *。限流以后有流量再加。
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 只处理 /api/v1/ 前缀
  if (!pathname.startsWith('/api/v1/')) {
    return NextResponse.next();
  }

  // OPTIONS 预检：直接回 204，带上 CORS 头
  if (req.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 });
    addCorsHeaders(res);
    return res;
  }

  // 其它请求：放行并在响应上注入 CORS 头
  const res = NextResponse.next();
  addCorsHeaders(res);
  return res;
}

function addCorsHeaders(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  res.headers.set('Access-Control-Max-Age', '86400'); // 预检缓存一天
}

export const config = {
  matcher: ['/api/v1/:path*'],
};
