export const PUBLIC_BASE_URL = 'https://nei-pevc.com';

const LEGACY_HOSTS = [
  'https://n-e-i-the-world-of-financial-evolut.vercel.app',
  'http://n-e-i-the-world-of-financial-evolut.vercel.app',
];

export function getPublicBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_URL?.trim() || PUBLIC_BASE_URL;
  const normalized = normalizePublicText(raw).replace(/\/+$/, '');
  return normalized || PUBLIC_BASE_URL;
}

export function normalizePublicUrl(url: string | null | undefined): string | null {
  if (!url) return url ?? null;
  return normalizePublicText(url);
}

export function normalizePublicText(text: string): string {
  return LEGACY_HOSTS.reduce((next, host) => next.replaceAll(host, PUBLIC_BASE_URL), text);
}
