/**
 * 管理员 dashboard 用的纯 SVG 图表组件（不引图表库，零依赖，贴合手抄本设计系统）。
 * 服务端可渲染，被 client 组件引用时自然进 client bundle。
 */

type Series = { label: string; color: string; values: number[] };

/** 多折线趋势图。labels 为 x 轴刻度（如 14 个日期），series.values 长度需与 labels 一致。 */
export function LineChart({
  labels,
  series,
  height = 170,
}: {
  labels: string[];
  series: Series[];
  height?: number;
}) {
  const W = 680;
  const H = height;
  const padL = 30;
  const padR = 14;
  const padT = 12;
  const padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = labels.length;

  const maxV = Math.max(1, ...series.flatMap((s) => s.values));
  // 取「好看」的刻度上限
  const niceMax = Math.ceil(maxV * 1.15) || 1;

  const x = (i: number) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => padT + (1 - v / niceMax) * plotH;

  const linePath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  // x 轴只标 4 个点，避免拥挤
  const labelIdx = n <= 4 ? labels.map((_, i) => i) : [0, Math.floor((n - 1) / 3), Math.floor((2 * (n - 1)) / 3), n - 1];
  const gridVals = [0, niceMax / 2, niceMax];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img">
      {/* 横向网格线 + y 刻度 */}
      {gridVals.map((gv, i) => (
        <g key={i}>
          <line x1={padL} y1={y(gv)} x2={W - padR} y2={y(gv)} stroke="#E4DAC4" strokeWidth={1} />
          <text x={padL - 6} y={y(gv) + 3} textAnchor="end" fontSize={9} fill="#8B6F4E" fontFamily="ui-monospace, monospace">
            {Math.round(gv)}
          </text>
        </g>
      ))}
      {/* 折线 */}
      {series.map((s) => (
        <path key={s.label} d={linePath(s.values)} fill="none" stroke={s.color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {/* x 刻度 */}
      {labelIdx.map((i) => (
        <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="#8B6F4E" fontFamily="ui-sans-serif, sans-serif">
          {labels[i].slice(5)}
        </text>
      ))}
    </svg>
  );
}

/** 图例 */
export function Legend({ series }: { series: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {series.map((s) => (
        <span key={s.label} className="inline-flex items-center gap-1.5 font-sans text-[11px] text-leather">
          <span className="inline-block w-2.5 h-0.5" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

/** 数字大卡：值 + 标签 + 副信息 */
export function StatCard({
  value,
  label,
  sub,
  accent = '#3D2E1F',
}: {
  value: string | number;
  label: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="border border-paper-edge bg-vellum rounded-md p-3">
      <p className="font-serif text-2xl num-osf leading-none" style={{ color: accent }}>
        {value}
      </p>
      <p className="mt-1.5 font-sans text-[11px] text-sepia">{label}</p>
      {sub && <p className="font-sans text-[10px] text-leather/70 mt-0.5">{sub}</p>}
    </div>
  );
}

/** 横条排行（热门 Skill / 路由分布） */
export function BarList({
  items,
  max,
  unit,
}: {
  items: { label: string; value: number; hint?: string }[];
  max?: number;
  unit?: string;
}) {
  const m = Math.max(1, ...(max ? [max] : items.map((i) => i.value)));
  if (items.length === 0) {
    return <p className="font-serif italic text-xs text-sepia py-2">暂无数据</p>;
  }
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-2">
          <span className="font-sans text-xs text-leather w-32 shrink-0 truncate" title={it.label}>{it.label}</span>
          <span className="flex-1 h-2 bg-linen rounded-sm overflow-hidden">
            <span className="block h-full bg-gilded/60" style={{ width: `${(it.value / m) * 100}%` }} />
          </span>
          <span className="font-mono text-[11px] text-sepia w-10 text-right shrink-0">
            {it.value}
            {unit}
          </span>
        </li>
      ))}
    </ul>
  );
}
