import { clsx } from 'clsx';
import { forwardRef, type InputHTMLAttributes } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      className={clsx(
        'w-full h-10 px-3.5 rounded-lg border border-ink-200 bg-white text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10',
        className,
      )}
      {...rest}
    />
  ),
);
Input.displayName = 'Input';
