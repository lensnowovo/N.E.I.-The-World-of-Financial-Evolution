import { forwardRef, useId } from 'react';
import { cn } from '@/lib/cn';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  containerClassName?: string;
};

/**
 * Input · 1px paper-edge 描边
 * 标签衬线、永远在上方左对齐
 * focus 转 ink-brown，error 转 wax-red
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, optional, className, containerClassName, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn('w-full', containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block font-serif text-sm text-ink-brown"
        >
          {label}
          {optional && (
            <span className="ml-1.5 text-xs font-sans text-sepia">（选填）</span>
          )}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'block w-full rounded-sm border border-paper-edge bg-vellum px-3 py-2 text-sm font-sans text-ink-brown',
          'placeholder:text-sepia/70',
          'transition-colors duration-150',
          'focus:border-ink-brown focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-60',
          error && 'border-wax-red focus:border-wax-red',
          className,
        )}
        aria-invalid={!!error}
        aria-describedby={error || hint ? `${inputId}-msg` : undefined}
        {...rest}
      />
      {(error || hint) && (
        <p
          id={`${inputId}-msg`}
          className={cn(
            'mt-1.5 text-xs font-sans',
            error ? 'text-wax-red' : 'text-sepia',
          )}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
});

/** Textarea —— 与 Input 同视觉规范，独立组件方便扩展 */
type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, hint, error, className, id, ...rest }, ref) {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block font-serif text-sm text-ink-brown"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'block w-full rounded-sm border border-paper-edge bg-vellum px-3 py-2 text-sm font-sans text-ink-brown',
            'placeholder:text-sepia/70',
            'focus:border-ink-brown focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-60',
            error && 'border-wax-red focus:border-wax-red',
            className,
          )}
          aria-invalid={!!error}
          {...rest}
        />
        {(error || hint) && (
          <p className={cn('mt-1.5 text-xs font-sans', error ? 'text-wax-red' : 'text-sepia')}>
            {error || hint}
          </p>
        )}
      </div>
    );
  },
);
