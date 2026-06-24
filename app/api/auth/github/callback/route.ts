import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCodeForToken,
  fetchGitHubProfile,
  fetchGitHubPrimaryEmail,
} from '@/lib/github-oauth';
import { prisma } from '@/lib/db';
import { setSession } from '@/lib/session';
import { verifyOAuthState } from '@/lib/oauth-state';
import { shouldBootstrapAdmin } from '@/lib/admin';

/**
 * GET /api/auth/github/callback?code=xxx&state=yyy
 *
 * GitHub redirects the user here after they authorize the app.
 * 我们先校验 `state` 是否与发起时写入的 cookie 匹配（CSRF 防护），
 * 通过后再交换 code、find-or-create User、设置 session cookie。
 */
export async function GET(req: NextRequest) {
  // 0. CSRF 校验：state 必须与发起时写入的 cookie 严格匹配 + 签名有效
  const stateOk = await verifyOAuthState(req.nextUrl.searchParams.get('state'));
  if (!stateOk) {
    return NextResponse.redirect(new URL('/login?error=invalid_state', req.url));
  }

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
        const createUserEmail = githubEmail || fallbackEmail;

        user = await prisma.user.create({
          data: {
            email: createUserEmail,
            nickname,
            role: 'VC',
            passwordHash: null,
            isAdmin: shouldBootstrapAdmin(createUserEmail),
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
