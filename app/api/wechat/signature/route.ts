import { NextResponse } from 'next/server';
import { generateSignature } from '@/lib/wechat';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * GET /api/wechat/signature?url=https://nei-pevc.com/posts/87
 * 返回微信 JS-SDK 签名，供前端 wx.config() 使用。
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get('url');
  if (!targetUrl) {
    return NextResponse.json({ error: '缺少 url 参数' }, { status: 400 });
  }
  try {
    const sig = await generateSignature(targetUrl);
    return NextResponse.json(sig);
  } catch (error) {
    const msg = error instanceof Error ? error.message : '签名生成失败';
    console.error('[wechat/signature]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
