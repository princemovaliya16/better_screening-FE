import { clsx } from 'clsx';
import { forwardRef, type SelectHTMLAttributes } from 'react';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...rest }, ref) => (
    <select
      ref={ref}
      className={clsx(
        'w-full h-10 px-3.5 rounded-lg border border-ink-200 bg-white text-sm text-ink-900 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';
