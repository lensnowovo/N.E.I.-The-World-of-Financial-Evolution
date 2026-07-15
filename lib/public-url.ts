export const PUBLIC_BASE_URL = 'https://nei-pevc.com';

const LEGACY_HOSTS = [
  'https://n-e-i-the-world-of-financial-evolut.vercel.app',
  'http://n-e-i-the-world-of-financial-evolut.vercel.app',
];

export function getPublicBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_BASE_URL;
  if (!configured) return PUBLIC_BASE_URL;

  // Environment values normally arrive without quotes, but local launch
  // wrappers and some CI systems can expose an empty quoted value (`""`) or
  // a bare hostname. Neither should be allowed to crash module evaluation in
  // app/layout.tsx when Metadata constructs a URL.
  const unquoted = configured.trim().replace(/^(['"])(.*)\1$/, '$2').trim();
  if (!unquoted) return PUBLIC_BASE_URL;

  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(unquoted)
    ? unquoted
    : `https://${unquoted}`;

  try {
    const parsed = new URL(normalizePublicText(candidate));
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return PUBLIC_BASE_URL;
    return parsed.href.replace(/\/+$/, '');
  } catch {
    return PUBLIC_BASE_URL;
  }
}

export function normalizePublicUrl(url: string | null | undefined): string | null {
  if (!url) return url ?? null;
  return normalizePublicText(url);
}

export function normalizePublicText(text: string): string {
  return LEGACY_HOSTS.reduce((next, host) => next.replaceAll(host, PUBLIC_BASE_URL), text);
}
