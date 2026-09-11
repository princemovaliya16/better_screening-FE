import { clsx } from 'clsx';
import type { ReactNode } from 'react';

type Tone = 'ink' | 'brand' | 'green' | 'amber' | 'rose' | 'sky' | 'violet' | 'slate' | 'fuchsia';

const tones: Record<Tone, string> = {
  ink: 'bg-ink-100 text-ink-600',
  brand: 'bg-brand-50 text-brand-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
  sky: 'bg-sky-50 text-sky-700',
  violet: 'bg-violet-50 text-violet-700',
  slate: 'bg-ink-50 text-ink-500 border border-ink-200',
  fuchsia: 'bg-fuchsia-50 text-fuchsia-700',
};

const dotColors: Record<Tone, string> = {
  ink: 'bg-ink-400',
  brand: 'bg-brand-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
  slate: 'bg-ink-400',
  fuchsia: 'bg-fuchsia-500',
};

export function Badge({
  children,
  tone = 'ink',
  dot,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize',
        tones[tone],
        className,
      )}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotColors[tone])} />}
      {children}
    </span>
  );
}
