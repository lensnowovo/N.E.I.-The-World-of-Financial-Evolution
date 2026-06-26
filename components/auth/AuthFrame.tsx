import { Ornament } from '@/components/icons/Ornament';
import { CrestCorners } from '@/components/icons/Crest';
import { cn } from '@/lib/cn';

type Props = {
  eyebrow?: string;     // 顶部小字，类似章节号
  title: string;
  subtitle?: string;
  /** 是否在卡片上加细线纹章角 */
  crest?: boolean;
  /** 步骤指示：当前 / 总数 / 名称数组 */
  step?: { current: number; labels: string[] };
  children: React.ReactNode;
  /** 卡片底部辅助文字（如 "已有账号？登录"） */
  footer?: React.ReactNode;
  /** 整体宽度（窄、中、宽） */
  size?: 'sm' | 'md' | 'lg';
};

/**
 * 认证页书页式容器
 * 居中单列、最大宽度像一页书；顶部 Cinzel 大字 + 衬线标题 + 副标题
 * 步骤指示用罗马数字（I II III），不用阿拉伯数字也不用进度条
 */
export function AuthFrame({
  eyebrow,
  title,
  subtitle,
  crest,
  step,
  children,
  footer,
  size = 'md',
}: Props) {
  return (
    <div
      className={cn(
        'mx-auto',
        size === 'sm' && 'max-w-md',
        size === 'md' && 'max-w-lg',
        size === 'lg' && 'max-w-4xl',
      )}
    >
      {/* —— 卷首大字 —— */}
      <div className="text-center mb-10">
        <p className="font-display tracking-display text-xs text-sepia uppercase mb-3">
          {eyebrow ?? 'N.E.I. · New Era Investors'}
        </p>
        <h1 className="font-serif text-4xl text-ink-brown">{title}</h1>
        {subtitle && (
          <p className="font-serif italic text-leather mt-2">{subtitle}</p>
        )}
        <div className="flex justify-center mt-5 text-leather">
          <Ornament width={64} />
        </div>
      </div>

      {/* —— 步骤指示（罗马数字） —— */}
      {step && (
        <ol className="mb-6 flex items-center justify-center gap-0">
          {step.labels.map((label, i) => {
            const num = i + 1;
            const isDone = num < step.current;
            const isCurrent = num === step.current;
            return (
              <li key={label} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'font-display tracking-display text-xs',
                      isCurrent ? 'text-ink-brown' : 'text-sepia',
                    )}
                  >
                    {toRoman(num)}
                  </span>
                  <span
                    className={cn(
                      'font-sans text-xs',
                      isCurrent ? 'text-ink-brown' : 'text-sepia',
                      isDone && 'line-through decoration-paper-edge',
                    )}
                  >
                    {label}
                  </span>
                </div>
                {i < step.labels.length - 1 && (
                  <span className="h-px w-8 bg-paper-edge" />
                )}
              </li>
            );
          })}
        </ol>
      )}

      {/* —— 卡片 —— */}
      <div className="relative border border-paper-edge bg-vellum rounded-md">
        {crest && <CrestCorners className="m-1.5" />}
        <div className="px-5 py-8 sm:px-10 sm:py-10">{children}</div>
      </div>

      {/* —— 页脚（次级链接） —— */}
      {footer && (
        <div className="mt-6 text-center font-serif text-sm text-sepia">
          {footer}
        </div>
      )}
    </div>
  );
}

function toRoman(n: number): string {
  return ['I', 'II', 'III', 'IV', 'V', 'VI'][n - 1] ?? String(n);
}
