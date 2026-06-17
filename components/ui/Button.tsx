import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'link';
type Size = 'sm' | 'md' | 'lg';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
};

/**
 * Button · 三档变体
 *   primary —— 深棕实底 + 浅文字，hover 转蜡封红
 *   secondary —— 透明底 + 棕描边
 *   ghost —— 无边无底，仅文字 hover
 *   link —— 衬线下划线，类似古籍引文
 * 圆角统一 2px，无阴影
 */
export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = 'primary',
    size = 'md',
    block,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-sm border transition-all duration-150 active:scale-[0.97]',
        'tracking-wide font-sans text-sm',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:ring-1 focus-visible:ring-ink-brown focus-visible:ring-offset-2 focus-visible:ring-offset-parchment',
        // 尺寸
        size === 'sm' && 'h-8 px-3 text-xs',
        size === 'md' && 'h-10 px-5',
        size === 'lg' && 'h-12 px-7 text-base',
        // 变体
        variant === 'primary' &&
          'border-ink-brown bg-ink-brown text-vellum hover:bg-wax-red hover:border-wax-red',
        variant === 'secondary' &&
          'border-ink-brown bg-transparent text-ink-brown hover:bg-ink-brown hover:text-vellum',
        variant === 'ghost' &&
          'border-transparent text-leather hover:text-ink-brown hover:bg-linen',
        variant === 'link' &&
          'border-transparent text-ink-brown underline underline-offset-4 decoration-paper-edge hover:decoration-wax-red hover:text-wax-red h-auto px-0',
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
