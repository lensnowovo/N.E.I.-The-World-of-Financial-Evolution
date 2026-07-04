'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const STORAGE_KEY = 'nei_anonymous_id';

function getAnonymousId(): string | null {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const generated = `anon_${crypto.randomUUID()}`;
    window.localStorage.setItem(STORAGE_KEY, generated);
    return generated;
  } catch {
    return null;
  }
}

export function ActivityTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = useMemo(() => searchParams.toString(), [searchParams]);

  useEffect(() => {
    if (!pathname) return;
    const anonymousId = getAnonymousId();
    const path = search ? `${pathname}?${search}` : pathname;
    const payload = JSON.stringify({
      type: 'page_view',
      path,
      anonymousId,
      referrer: document.referrer || null,
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/activity', blob);
      return;
    }

    fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }, [pathname, search]);

  return null;
}
