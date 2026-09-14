import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui';
import { Sparkline } from './Sparkline';

export function KpiCard({
  icon,
  iconBg,
  label,
  value,
  delta,
  sparkline,
  sparklineColor,
}: {
  icon: ReactNode;
  iconBg: string;
  label: string;
  value: number;
  delta: number;
  sparkline: number[];
  sparklineColor: string;
}) {
  const isUp = delta >= 0;

  return (
    <Card className="p-4 pb-0 overflow-hidden">
      <div className="flex items-start justify-between mb-3">
        <div className={clsx('w-9 h-9 rounded-xl grid place-items-center text-white', iconBg)}>
          {icon}
        </div>
        {delta !== 0 && (
          <span
            className={clsx(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold',
              isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600',
            )}
          >
            {isUp ? '↗' : '↘'} {isUp ? '+' : ''}
            {delta}
          </span>
        )}
      </div>
      <p className="font-extrabold text-[24px] text-ink-900 leading-none">{value}</p>
      <p className="text-[12px] text-ink-500 mt-1.5 leading-snug">{label}</p>
      {/* Bleeds past the card's own side/bottom padding so the chart fills the tile's
       * full width and its bottom edge is clipped to the card's rounded corners by
       * `overflow-hidden` above, instead of sitting inset like a small icon. */}
      <div className="-mx-4 mt-2.5">
        <Sparkline data={sparkline} colorClassName={sparklineColor} />
      </div>
    </Card>
  );
}
