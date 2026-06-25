'use client';

import { useEffect, useState } from 'react';
import { formatStableDate, formatTime } from '@/lib/format';

type Props = {
  value: Date | string | null | undefined;
  className?: string;
  relative?: boolean;
};

export function TimeText({ value, className, relative = true }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!value) return null;

  const date = typeof value === 'string' ? new Date(value) : value;
  const fallback = formatStableDate(date);

  return (
    <time
      dateTime={Number.isNaN(date.getTime()) ? undefined : date.toISOString()}
      className={className}
      suppressHydrationWarning
    >
      {mounted && relative ? formatTime(date) : fallback}
    </time>
  );
}
