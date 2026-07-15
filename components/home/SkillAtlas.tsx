'use client';

import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import { useRef } from 'react';

type AtlasStyle = CSSProperties & {
  '--atlas-x': string;
  '--atlas-y': string;
  '--atlas-shift-x': string;
  '--atlas-shift-y': string;
};

const INDEX_NODES = [
  { code: '01', label: 'BP 初筛', className: 'left-[71%] top-[18%]' },
  { code: '02', label: '行业研究', className: 'left-[84%] top-[36%]' },
  { code: '03', label: '商业尽调', className: 'left-[76%] top-[61%]' },
  { code: '04', label: 'IC MEMO', className: 'left-[89%] top-[78%]' },
] as const;

export function SkillAtlas({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 74, y: 42, shiftX: 0, shiftY: 0 });

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'touch') return;
    const root = rootRef.current;
    if (!root) return;

    const bounds = root.getBoundingClientRect();
    const relativeX = (event.clientX - bounds.left) / bounds.width;
    const relativeY = (event.clientY - bounds.top) / bounds.height;
    targetRef.current = {
      x: relativeX * 100,
      y: relativeY * 100,
      shiftX: (relativeX - 0.5) * 12,
      shiftY: (relativeY - 0.5) * 8,
    };

    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(() => {
      const next = targetRef.current;
      root.style.setProperty('--atlas-x', `${next.x}%`);
      root.style.setProperty('--atlas-y', `${next.y}%`);
      root.style.setProperty('--atlas-shift-x', `${next.shiftX}px`);
      root.style.setProperty('--atlas-shift-y', `${next.shiftY}px`);
      frameRef.current = null;
    });
  }

  const style: AtlasStyle = {
    '--atlas-x': '74%',
    '--atlas-y': '42%',
    '--atlas-shift-x': '0px',
    '--atlas-shift-y': '0px',
  };

  return (
    <div ref={rootRef} style={style} onPointerMove={handlePointerMove} className="skill-atlas">
      <div className="skill-atlas__coordinates" aria-hidden="true" />
      <div className="skill-atlas__contours" aria-hidden="true" />

      <div className="skill-atlas__index" aria-hidden="true">
        {INDEX_NODES.map((node, index) => (
          <div
            key={node.code}
            className={`skill-atlas__node ${node.className}`}
            style={{ animationDelay: `${index * -1.7}s` }}
          >
            <span>{node.code}</span>
            <i />
            <strong>{node.label}</strong>
          </div>
        ))}
      </div>

      <div className="relative z-[2]">{children}</div>
    </div>
  );
}
