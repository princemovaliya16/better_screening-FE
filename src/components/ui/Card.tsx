import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx('bg-white rounded-2xl border border-ink-200/70 shadow-sm', className)}
      {...rest}
    />
  );
}
