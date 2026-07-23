import { getPublicBaseUrl } from '@/lib/public-url';

export const dynamic = 'force-dynamic';

export async function GET() {
  const baseUrl = getPublicBaseUrl();
  const lines = [
    'Contact: https://github.com/lensnowovo/N.E.I.-The-World-of-Financial-Evolution/security/advisories/new',
    `Policy: ${baseUrl}/security`,
    `Canonical: ${baseUrl}/.well-known/security.txt`,
    'Preferred-Languages: zh, en',
    'Expires: 2027-07-22T00:00:00.000Z',
  ];
  return new Response(`${lines.join('\n')}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
