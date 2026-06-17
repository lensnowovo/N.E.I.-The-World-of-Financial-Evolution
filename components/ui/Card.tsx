import { cn } from '@/lib/cn';
import { CrestCorners } from '@/components/icons/Crest';

type Props = React.HTMLAttributes<HTMLDivElement> & {
  /** 是否显示四角细线纹章（仅 hero / 重要卡使用） */
  crest?: boolean;
  /** 是否为可交互卡片（hover 时边框加深） */
  interactive?: boolean;
  /** 内边距档位 */
  padding?: 'sm' | 'md' | 'lg' | 'none';
  /** 卡片底色 —— 默认 vellum，二档 linen */
  tone?: 'vellum' | 'linen';
};

/**
 * Card · 设计系统基础容器
 * 1px paper-edge 描边 + 2-4px 圆角 + 无阴影
 * interactive 模式 hover 时边框加深到 sepia（不上移、不抬升）
 */
export function Card({
  crest,
  interactive,
  padding = 'md',
  tone = 'vellum',
  className,
  children,
  ...rest
}: Props) {
  return (
    <div
      className={cn(
        'relative border border-paper-edge rounded-md',
        tone === 'vellum' ? 'bg-vellum' : 'bg-linen',
        padding === 'sm' && 'p-4',
        padding === 'md' && 'p-6',
        padding === 'lg' && 'p-8',
        padding === 'none' && 'p-0',
        interactive &&
          'transition-colors duration-150 hover:border-sepia',
        className,
      )}
      {...rest}
    >
      {crest && <CrestCorners className="m-1.5" />}
      {children}
    </div>
  );
}

export function CardTitle({
  as: As = 'h2',
  className,
  children,
}: {
  as?: 'h1' | 'h2' | 'h3' | 'h4';
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <As className={cn('font-serif text-2xl text-ink-brown leading-snug', className)}>
      {children}
    </As>
  );
}

export function CardMeta({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('text-xs font-sans text-sepia', className)}>
      {children}
    </div>
  );
}
