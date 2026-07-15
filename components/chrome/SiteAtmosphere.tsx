'use client';

import { useEffect, useRef } from 'react';

type FieldNode = {
  anchorX: number;
  anchorY: number;
  x: number;
  y: number;
  phase: number;
};

const FIELD_LABELS = [
  { code: '01', text: '项目初筛', x: 0.08, y: 0.16 },
  { code: '02', text: 'INDUSTRY RESEARCH', x: 0.72, y: 0.12 },
  { code: '03', text: '商业尽调', x: 0.9, y: 0.31 },
  { code: '04', text: 'EXPERT INTERVIEW', x: 0.16, y: 0.43 },
  { code: '05', text: '财务分析', x: 0.61, y: 0.48 },
  { code: '06', text: 'IC MEMO', x: 0.83, y: 0.62 },
  { code: '07', text: '投后管理', x: 0.1, y: 0.72 },
  { code: '08', text: 'LP REPORTING', x: 0.4, y: 0.84 },
  { code: '09', text: 'FUND OPERATIONS', x: 0.73, y: 0.88 },
  { code: 'S1', text: '半导体', x: 0.24, y: 0.11 },
  { code: 'S2', text: 'ARTIFICIAL INTELLIGENCE', x: 0.49, y: 0.17 },
  { code: 'S3', text: '生物医药', x: 0.88, y: 0.18 },
  { code: 'S4', text: '新能源', x: 0.31, y: 0.35 },
  { code: 'S5', text: '智能制造', x: 0.77, y: 0.4 },
  { code: 'S6', text: '新材料', x: 0.08, y: 0.58 },
  { code: 'S7', text: 'ENTERPRISE SOFTWARE', x: 0.48, y: 0.68 },
  { code: 'S8', text: '消费', x: 0.91, y: 0.76 },
  { code: 'S9', text: '机器人', x: 0.24, y: 0.92 },
] as const;

const FIELD_PARALLAX_SPEED = 0.1;
const ROUTE_PARALLAX_SPEED = 0.12;

export function SiteAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;
    const drawingContext = canvasElement.getContext('2d');
    if (!drawingContext) return;
    const canvas: HTMLCanvasElement = canvasElement;
    const context: CanvasRenderingContext2D = drawingContext;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const interactive = window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reducedMotion;
    const pointer = { x: -1000, y: -1000 };
    let width = 0;
    let height = 0;
    let documentHeight = 0;
    let fieldHeight = 0;
    let scrollPosition = window.scrollY;
    let nodes: FieldNode[] = [];
    let edges: Array<[number, number]> = [];
    let labelNodeIndexes: number[] = [];
    let frame: number | null = null;
    let lastFrame = 0;

    function rebuildField() {
      width = window.innerWidth;
      height = window.innerHeight;
      documentHeight = Math.max(document.documentElement.scrollHeight, height);
      fieldHeight = height + Math.max(0, documentHeight - height) * FIELD_PARALLAX_SPEED;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const columns = Math.max(7, Math.ceil(width / 190));
      const rows = Math.max(5, Math.ceil(fieldHeight / 190));
      nodes = [];
      edges = [];

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const index = row * columns + column;
          const anchorX = ((column + 0.5) / columns) * width + Math.sin(index * 2.17) * 24;
          const anchorY = ((row + 0.5) / rows) * fieldHeight + Math.cos(index * 1.73) * 20;
          nodes.push({
            anchorX,
            anchorY,
            x: anchorX,
            y: anchorY - scrollPosition * FIELD_PARALLAX_SPEED,
            phase: index * 0.83,
          });

          if (column < columns - 1) edges.push([index, index + 1]);
          if (row < rows - 1 && (index + row) % 3 !== 0) edges.push([index, index + columns]);
          if (row < rows - 1 && column < columns - 1 && index % 5 === 0) {
            edges.push([index, index + columns + 1]);
          }
        }
      }

      labelNodeIndexes = FIELD_LABELS.map((label) => {
        const targetX = label.x * width;
        const targetY = label.y * fieldHeight;
        let closestIndex = 0;
        let closestDistance = Number.POSITIVE_INFINITY;
        for (let index = 0; index < nodes.length; index += 1) {
          const distance = Math.hypot(nodes[index].anchorX - targetX, nodes[index].anchorY - targetY);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        }
        return closestIndex;
      });
    }

    function drawRoutes(time: number) {
      const routes = [
        { y: 0.2, bend: 0.12, color: 'rgba(117, 88, 49, 0.11)', speed: 0.012 },
        { y: 0.53, bend: -0.1, color: 'rgba(65, 91, 75, 0.1)', speed: -0.009 },
        { y: 0.82, bend: 0.08, color: 'rgba(117, 88, 49, 0.075)', speed: 0.007 },
      ];

      context.lineWidth = 0.8;
      context.setLineDash([2, 13]);
      context.lineCap = 'round';
      for (const route of routes) {
        const routePeriod = height + 240;
        const routeY = (((height * route.y - scrollPosition * ROUTE_PARALLAX_SPEED + 120) % routePeriod) + routePeriod) % routePeriod - 120;
        context.beginPath();
        context.moveTo(-40, routeY);
        context.bezierCurveTo(
          width * 0.23,
          routeY + height * route.bend,
          width * 0.58,
          routeY - height * route.bend,
          width + 40,
          routeY,
        );
        context.strokeStyle = route.color;
        context.lineDashOffset = time * route.speed;
        context.stroke();
      }
      context.setLineDash([]);
      context.lineDashOffset = 0;
    }

    function draw(time: number) {
      context.clearRect(0, 0, width, height);
      drawRoutes(time);

      const influenceRadius = 185;
      for (const node of nodes) {
        const ambientX = Math.sin(time * 0.00028 + node.phase) * 2.4;
        const ambientY = Math.cos(time * 0.00024 + node.phase) * 2;
        const screenAnchorY = node.anchorY - scrollPosition * FIELD_PARALLAX_SPEED;
        const dx = node.anchorX - pointer.x;
        const dy = screenAnchorY - pointer.y;
        const distance = Math.hypot(dx, dy);
        const force = distance < influenceRadius ? Math.pow(1 - distance / influenceRadius, 2) * 42 : 0;
        const targetX = node.anchorX + ambientX + (distance > 0 ? (dx / distance) * force : 0);
        const targetY = screenAnchorY + ambientY + (distance > 0 ? (dy / distance) * force : 0);
        node.x += (targetX - node.x) * 0.11;
        node.y += (targetY - node.y) * 0.11;
      }

      context.lineWidth = 0.7;
      for (let index = 0; index < edges.length; index += 1) {
        const [fromIndex, toIndex] = edges[index];
        const from = nodes[fromIndex];
        const to = nodes[toIndex];
        if ((from.y < -80 && to.y < -80) || (from.y > height + 80 && to.y > height + 80)) continue;
        const midpointX = (from.x + to.x) / 2;
        const midpointY = (from.y + to.y) / 2;
        const pointerDistance = Math.hypot(midpointX - pointer.x, midpointY - pointer.y);
        const active = Math.max(0, 1 - pointerDistance / 240);

        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.strokeStyle = index % 4 === 0
          ? `rgba(65, 91, 75, ${0.055 + active * 0.13})`
          : `rgba(117, 88, 49, ${0.045 + active * 0.105})`;
        context.stroke();
      }

      context.font = "500 9px ui-monospace, 'SF Mono', Menlo, monospace";
      context.textBaseline = 'middle';
      for (let index = 0; index < FIELD_LABELS.length; index += 1) {
        const label = FIELD_LABELS[index];
        const node = nodes[labelNodeIndexes[index]];
        if (!node || node.y < -40 || node.y > height + 40) continue;
        const direction = index % 3 === 0 ? -1 : 1;
        const textX = node.x + direction * 11;
        const textY = node.y - 9 - (index % 2) * 4;
        const pointerDistance = Math.hypot(node.x - pointer.x, node.y - pointer.y);
        const active = Math.max(0, 1 - pointerDistance / 250);
        const alpha = 0.21 + active * 0.39;

        context.beginPath();
        context.moveTo(node.x + direction * 3, node.y - 2);
        context.lineTo(node.x + direction * 8, textY);
        context.strokeStyle = `rgba(108, 79, 43, ${0.1 + active * 0.18})`;
        context.stroke();

        context.textAlign = direction > 0 ? 'left' : 'right';
        context.fillStyle = index % 3 === 1
          ? `rgba(57, 83, 68, ${alpha})`
          : `rgba(105, 75, 40, ${alpha})`;
        context.fillText(`${label.code} · ${label.text}`, textX, textY);
      }

      for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index];
        if (node.y < -24 || node.y > height + 24) continue;
        const pointerDistance = Math.hypot(node.x - pointer.x, node.y - pointer.y);
        const active = Math.max(0, 1 - pointerDistance / 220);
        context.beginPath();
        context.arc(node.x, node.y, 1.15 + active * 0.9, 0, Math.PI * 2);
        context.fillStyle = index % 5 === 0
          ? `rgba(59, 87, 70, ${0.2 + active * 0.42})`
          : `rgba(111, 80, 43, ${0.16 + active * 0.34})`;
        context.fill();

        if (index % 11 === 0) {
          context.beginPath();
          context.arc(node.x, node.y, 5.5 + Math.sin(time * 0.001 + node.phase) * 0.8, 0, Math.PI * 2);
          context.strokeStyle = `rgba(93, 72, 42, ${0.07 + active * 0.16})`;
          context.stroke();
        }
      }
    }

    function animate(time: number) {
      if (time - lastFrame >= 30) {
        draw(time);
        lastFrame = time;
      }
      frame = window.requestAnimationFrame(animate);
    }

    function handlePointerMove(event: PointerEvent) {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    }

    function handlePointerLeave() {
      pointer.x = -1000;
      pointer.y = -1000;
    }

    function handleScroll() {
      scrollPosition = window.scrollY;
      if (!interactive) draw(0);
    }

    function handleResize() {
      rebuildField();
      if (!interactive) draw(0);
    }

    rebuildField();
    if (interactive) {
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      document.documentElement.addEventListener('mouseleave', handlePointerLeave);
      frame = window.requestAnimationFrame(animate);
    } else {
      draw(0);
    }
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    const pageResizeObserver = new ResizeObserver(() => {
      const nextDocumentHeight = Math.max(document.documentElement.scrollHeight, window.innerHeight);
      if (Math.abs(nextDocumentHeight - documentHeight) > 80) rebuildField();
    });
    pageResizeObserver.observe(document.documentElement);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.documentElement.removeEventListener('mouseleave', handlePointerLeave);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      pageResizeObserver.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="site-atmosphere" aria-hidden="true">
      <div className="site-atmosphere__light" />
      <canvas ref={canvasRef} className="site-atmosphere__field" />
      <div className="site-atmosphere__fibres" />
    </div>
  );
}
