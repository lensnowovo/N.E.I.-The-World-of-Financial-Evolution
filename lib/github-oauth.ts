/**
 * GitHub OAuth helper functions.
 *
 * exchangeCodeForToken — swap the one-time authorization code for an access token
 * fetchGitHubProfile   — retrieve the authenticated user's GitHub profile
 */

export interface GitHubProfile {
  id: number;
  login: string;
  email: string | null;
  avatar_url: string;
  name: string | null;
}

/**
 * Exchange the authorization code (received on the callback) for a GitHub
 * access token using the server-to-server token endpoint.
 */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET are not configured');
  }

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });

  if (!res.ok) {
    throw new Error(`GitHub token exchange failed: ${res.status}`);
  }

  const data = await res.json();

  if (data.error) {
    throw new Error(`GitHub token exchange error: ${data.error_description ?? data.error}`);
  }

  return data.access_token as string;
}

/**
 * Fetch the authenticated user's GitHub profile using the access token.
 */
export async function fetchGitHubProfile(accessToken: string): Promise<GitHubProfile> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub profile fetch failed: ${res.status}`);
  }

  return (await res.json()) as GitHubProfile;
}

/**
 * Fetch the user's primary, verified email via the /user/emails endpoint.
 *
 * The public profile (`/user`) only returns an email when the user has chosen
 * to display a public email — many do not. Without this fallback we'd be
 * forced to store a fake `@github.placeholder` address, which then breaks
 * email-code login for that user. Returns null if no usable email is found.
 */
export async function fetchGitHubPrimaryEmail(accessToken: string): Promise<string | null> {
  const res = await fetch('https://api.github.com/user/emails', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!res.ok) return null;

  const emails = (await res.json()) as Array<{
    email: string;
    primary: boolean;
    verified: boolean;
  }>;

  // 优先：已验证的主邮箱；其次：任意已验证邮箱；最后：任意主邮箱
  const verifiedPrimary = emails.find((e) => e.primary && e.verified);
  if (verifiedPrimary) return verifiedPrimary.email;
  const anyVerified = emails.find((e) => e.verified);
  if (anyVerified) return anyVerified.email;
  const anyPrimary = emails.find((e) => e.primary);
  return anyPrimary?.email ?? null;
}
