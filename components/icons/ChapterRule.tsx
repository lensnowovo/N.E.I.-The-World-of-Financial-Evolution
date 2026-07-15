'use client';

import { useId } from 'react';
import { cn } from '@/lib/cn';
import { Ornament } from '@/components/icons/Ornament';

export function ChapterRule({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '');

  return (
    <div
      className={cn('pointer-events-none flex h-4 items-center', className)}
      aria-hidden="true"
    >
      <RuleSegment gradientId={`chapter-rule-left-${id}`} direction="in" />
      <Ornament
        width={72}
        className="shrink-0"
        style={{ color: 'rgba(168, 131, 57, 0.6)' }}
        continuous
      />
      <RuleSegment gradientId={`chapter-rule-right-${id}`} direction="out" />
    </div>
  );
}

function RuleSegment({
  gradientId,
  direction,
}: {
  gradientId: string;
  direction: 'in' | 'out';
}) {
  return (
    <svg
      className="block h-4 min-w-0 flex-1"
      viewBox="0 0 100 16"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="8"
          x2="100"
          y2="8"
        >
          <stop offset="0%" stopColor="#A88339" stopOpacity={direction === 'in' ? 0 : 0.6} />
          <stop offset="100%" stopColor="#A88339" stopOpacity={direction === 'in' ? 0.6 : 0} />
        </linearGradient>
      </defs>
      <line
        x1="0"
        y1="8"
        x2="100"
        y2="8"
        stroke={`url(#${gradientId})`}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
