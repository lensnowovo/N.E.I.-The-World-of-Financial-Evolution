import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/github
 *
 * Initiates GitHub OAuth flow — redirects the user to GitHub's authorization
 * page.  After the user consents, GitHub redirects back to the callback route.
 */
export async function GET(_req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return new NextResponse('GitHub OAuth is not configured', { status: 500 });
  }

  // Determine the base URL so the callback path works in any environment
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const callbackUrl = `${baseUrl}/api/auth/github/callback`;

  const githubAuthUrl =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${clientId}` +
    `&scope=user:email` +
    `&redirect_uri=${encodeURIComponent(callbackUrl)}`;

  return NextResponse.redirect(githubAuthUrl);
}
