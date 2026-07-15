'use client';

import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import { useEffect, useRef } from 'react';

type MemoryAtmosphereProps = {
  children: ReactNode;
  className?: string;
  variant?: 'hero' | 'compact';
};

type MemoryAtmosphereStyle = CSSProperties & {
  '--memory-x': string;
  '--memory-y': string;
};

export function MemoryAtmosphere({
  children,
  className = '',
  variant = 'hero',
}: MemoryAtmosphereProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 50, y: 42 });
  const currentRef = useRef({ x: 50, y: 42 });

  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (!finePointer.matches || reducedMotion.matches) return;

    const animate = () => {
      const root = rootRef.current;
      if (!root) return;

      const current = currentRef.current;
      const target = targetRef.current;
      current.x += (target.x - current.x) * 0.09;
      current.y += (target.y - current.y) * 0.09;
      root.style.setProperty('--memory-x', `${current.x}%`);
      root.style.setProperty('--memory-y', `${current.y}%`);

      const settled = Math.abs(target.x - current.x) < 0.05 && Math.abs(target.y - current.y) < 0.05;
      frameRef.current = settled ? null : window.requestAnimationFrame(animate);
    };

    const start = () => {
      if (frameRef.current === null) frameRef.current = window.requestAnimationFrame(animate);
    };

    rootRef.current?.addEventListener('memory-pointer-change', start);
    const root = rootRef.current;

    return () => {
      root?.removeEventListener('memory-pointer-change', start);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'touch') return;
    const root = rootRef.current;
    if (!root) return;

    const bounds = root.getBoundingClientRect();
    targetRef.current = {
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    };
    root.dispatchEvent(new Event('memory-pointer-change'));
  }

  const style: MemoryAtmosphereStyle = {
    '--memory-x': '50%',
    '--memory-y': variant === 'hero' ? '42%' : '50%',
  };

  return (
    <div
      ref={rootRef}
      style={style}
      onPointerMove={handlePointerMove}
      className={`memory-atmosphere memory-atmosphere--${variant} ${className}`}
    >
      <div className="memory-atmosphere__aurora" aria-hidden="true" />
      <div className="memory-atmosphere__grid" aria-hidden="true" />
      <div className="memory-atmosphere__spotlight" aria-hidden="true" />
      <div className="memory-atmosphere__noise" aria-hidden="true" />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
