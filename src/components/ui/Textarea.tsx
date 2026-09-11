import { clsx } from 'clsx';
import { forwardRef, type TextareaHTMLAttributes } from 'react';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, rows = 4, ...rest }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={clsx(
        'w-full px-3.5 py-2.5 rounded-lg border border-ink-200 bg-white text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 resize-none leading-relaxed',
        className,
      )}
      {...rest}
    />
  ),
);
Textarea.displayName = 'Textarea';
