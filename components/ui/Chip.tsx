import { cn } from '@/lib/cn';
import { SkillIcon } from '@/components/icons/SkillIcon';

type ChipBaseProps = {
  className?: string;
  onClick?: () => void;
  as?: 'span' | 'button' | 'a';
  href?: string;
  active?: boolean;
  children: React.ReactNode;
};

/* ============================================================
   工作场景 · 印章式
   矩形 + ink-brown 1px 描边 + 透明底
   ============================================================ */
export function SceneChip({ children, active, ...rest }: ChipBaseProps) {
  return (
    <ChipShell
      {...rest}
      className={cn(
        'h-6 px-2.5 border border-ink-brown text-ink-brown bg-transparent',
        'font-serif text-xs tracking-wide uppercase',
        'rounded-none',
        active && 'bg-ink-brown text-vellum',
      )}
    >
      {children}
    </ChipShell>
  );
}

/* ============================================================
   行业赛道 · 药丸式
   全圆角 + linen 实底 + leather 文字
   ============================================================ */
export function IndustryChip({ children, active, ...rest }: ChipBaseProps) {
  return (
    <ChipShell
      {...rest}
      className={cn(
        'h-6 px-3 rounded-full bg-linen text-leather',
        'font-sans text-xs',
        'border border-transparent',
        active && 'bg-leather text-vellum',
      )}
    >
      {children}
    </ChipShell>
  );
}

/* ============================================================
   工作内容 · 折角小卡片
   矩形 + 右上角折痕 SVG
   ============================================================ */
export function ContentChip({ children, active, ...rest }: ChipBaseProps) {
  return (
    <ChipShell
      {...rest}
      className={cn(
        'relative h-6 pl-2.5 pr-4 bg-parchment border border-paper-edge text-leather',
        'font-sans text-xs',
        'rounded-none',
        active && 'border-ink-brown text-ink-brown',
      )}
    >
      {children}
      {/* 右上角折角 —— 4px 三角 */}
      <svg
        width="6"
        height="6"
        viewBox="0 0 6 6"
        className="absolute right-0 top-0"
        aria-hidden="true"
      >
        <path d="M0 0 H6 V6 Z" fill="var(--linen)" />
        <path d="M6 0 V6 L0 0" stroke="var(--paper-edge)" strokeWidth="0.5" fill="none" />
      </svg>
    </ChipShell>
  );
}

/* ============================================================
   Skill 类型 · 圆形徽章 + 左侧 icon
   微金色描边，凸显"工具/技能"属性
   ============================================================ */
export function SkillChip({
  skillKey,
  children,
  active,
  ...rest
}: ChipBaseProps & { skillKey: string }) {
  return (
    <ChipShell
      {...rest}
      className={cn(
        'h-6 pl-1.5 pr-3 gap-1.5 rounded-full bg-vellum border border-gilded/60 text-ink-brown',
        'font-sans text-xs',
        active && 'bg-gilded/15 border-gilded',
      )}
    >
      <span className="grid place-content-center w-4 h-4 rounded-full bg-parchment text-gilded">
        <SkillIcon skill={skillKey} size={11} className="text-gilded" />
      </span>
      {children}
    </ChipShell>
  );
}

/* ============================================================
   通用 ChipShell —— 三种 element 形态
   ============================================================ */
function ChipShell({
  as,
  href,
  onClick,
  className,
  children,
}: ChipBaseProps) {
  const cls = cn(
    'inline-flex items-center whitespace-nowrap leading-none align-middle',
    'transition-colors duration-150',
    (onClick || href || as === 'button') && 'cursor-pointer hover:opacity-80',
    className,
  );
  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  if (as === 'button' || onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {children}
      </button>
    );
  }
  return <span className={cls}>{children}</span>;
}
