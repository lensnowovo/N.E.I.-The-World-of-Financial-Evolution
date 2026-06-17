import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind 类合并：去重 + 后写覆盖前写 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
