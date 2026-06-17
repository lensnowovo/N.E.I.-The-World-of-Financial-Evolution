import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCodeForToken,
  fetchGitHubProfile,
  fetchGitHubPrimaryEmail,
} from '@/lib/github-oauth';
import { prisma } from '@/lib/db';
import { setSession } from '@/lib/session';

/**
 * GET /api/auth/github/callback?code=xxx
 *
 * GitHub redirects the user here after they authorize the app.
 * We exchange the code for a token, fetch the GitHub profile,
 * find-or-create a User in our DB, and set a session cookie.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', req.url));
  }

  try {
    // 1. Exchange code for access token
    const accessToken = await exchangeCodeForToken(code);

    // 2. Fetch GitHub profile
    const ghProfile = await fetchGitHubProfile(accessToken);

    const githubId = String(ghProfile.id);
    const githubUsername = ghProfile.login;
    const githubAvatarUrl = ghProfile.avatar_url;

    // 公开 profile 的 email 多数为 null —— 用 /user/emails 兜底拿真实主邮箱，
    // 避免存假邮箱导致该用户日后无法用邮箱验证码登录。
    let githubEmail = ghProfile.email;
    if (!githubEmail) {
      githubEmail = await fetchGitHubPrimaryEmail(accessToken);
    }

    // 3. Try to find existing user by githubId
    let user = await prisma.user.findUnique({ where: { githubId } });

    if (user) {
      // Update GitHub fields in case they changed
      user = await prisma.user.update({
        where: { id: user.id },
        data: { githubAvatarUrl, githubUsername },
      });
    } else {
      // 4. Check if a user exists with the GitHub email (link accounts)
      if (githubEmail) {
        user = await prisma.user.findUnique({ where: { email: githubEmail } });
      }

      if (user) {
        // Link this GitHub account to the existing email-based user
        user = await prisma.user.update({
          where: { id: user.id },
          data: { githubId, githubAvatarUrl, githubUsername },
        });
      } else {
        // 5. Create a brand-new user via GitHub
        const nickname = await generateUniqueNickname(githubUsername);

        // 极少数情况：用户连 /user/emails 都没返回可用邮箱。
        // 用带 githubId 的占位邮箱满足 @unique 约束；这类用户只能走 GitHub 登录。
        const fallbackEmail = `${githubUsername}-${githubId}@github.placeholder`;

        user = await prisma.user.create({
          data: {
            email: githubEmail || fallbackEmail,
            nickname,
            role: 'VC',
            passwordHash: null,
            githubId,
            githubAvatarUrl,
            githubUsername,
            avatarUrl: githubAvatarUrl,
          },
        });
      }
    }

    // 6. Set session cookie
    await setSession(user.id);

    // 7. Redirect to home
    return NextResponse.redirect(new URL('/', req.url));
  } catch (err) {
    console.error('GitHub OAuth callback error:', err);
    return NextResponse.redirect(new URL('/login?error=github_oauth_failed', req.url));
  }
}

/**
 * Generate a unique nickname based on the GitHub username.
 * If the base name is taken, append incrementing numbers.
 */
async function generateUniqueNickname(base: string): Promise<string> {
  // Sanitize: keep only alphanumeric, dash, underscore, and CJK characters
  let candidate = base.replace(/[^\w一-鿿-]/g, '').slice(0, 18);
  if (!candidate) candidate = 'github_user';

  let nickname = candidate;

  for (let i = 1; i <= 100; i++) {
    const existing = await prisma.user.findUnique({ where: { nickname } });
    if (!existing) return nickname;
    nickname = `${candidate}${i}`;
  }

  // Fallback with a random suffix
  return `${candidate}_${Date.now()}`;
}
