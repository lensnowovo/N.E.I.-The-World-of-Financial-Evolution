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

  if (!isAllowedWechatShareUrl(targetUrl)) {
    return NextResponse.json({ error: '不允许为该 URL 生成微信签名' }, { status: 400 });
  }

  try {
    const sig = await generateSignature(targetUrl);
    return NextResponse.json(sig);
  } catch (error) {
    const msg = error instanceof Error ? error.message : '签名生成失败';
    console.error('[wechat/signature]', msg);
    const isConfigError = msg.includes('未配置');
    return NextResponse.json(
      { error: isConfigError ? '微信分享暂未配置完成' : '签名生成失败' },
      { status: isConfigError ? 503 : 500 },
    );
  }
}

function isAllowedWechatShareUrl(raw: string) {
  try {
    const parsed = new URL(raw);
    const publicBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://nei-pevc.com';
    const publicHost = new URL(publicBaseUrl).host;
    const allowedHosts = new Set([publicHost, 'nei-pevc.com']);

    const isLocalDev = process.env.NODE_ENV !== 'production';
    if (isLocalDev) {
      allowedHosts.add('localhost:3000');
      allowedHosts.add('127.0.0.1:3000');
      allowedHosts.add('localhost:3011');
      allowedHosts.add('127.0.0.1:3011');
    }

    const protocolAllowed = parsed.protocol === 'https:' || (isLocalDev && parsed.protocol === 'http:');
    return protocolAllowed && allowedHosts.has(parsed.host);
  } catch {
    return false;
  }
}
