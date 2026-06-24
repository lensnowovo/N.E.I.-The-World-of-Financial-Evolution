import { NextRequest, NextResponse } from 'next/server';
import { issueOAuthState } from '@/lib/oauth-state';

/**
 * GET /api/auth/github
 *
 * Initiates GitHub OAuth flow — redirects the user to GitHub's authorization
 * page.  After the user consents, GitHub redirects back to the callback route.
 *
 * 生成一个签名的 `state` token，同时写入短期 cookie，回调时必须 query 与
 * cookie 严格匹配（CSRF 防护）。
 */
export async function GET(_req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return new NextResponse('GitHub OAuth is not configured', { status: 500 });
  }

  // CSRF 防护：签发 one-shot state，写入 cookie 并拼到 authorize URL 上
  const state = await issueOAuthState();

  // Determine the base URL so the callback path works in any environment
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const callbackUrl = `${baseUrl}/api/auth/github/callback`;

  const githubAuthUrl =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${clientId}` +
    `&scope=user:email` +
    `&state=${encodeURIComponent(state)}` +
    `&redirect_uri=${encodeURIComponent(callbackUrl)}`;

  return NextResponse.redirect(githubAuthUrl);
}
