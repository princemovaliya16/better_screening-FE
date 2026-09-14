import { useId } from 'react';

/** A tiny inline area/line chart from real daily-bucketed counts (see the
 * dashboard's `KpiCard.sparkline`) — never decorative/random data. A flat/all-zero
 * series still draws as a flat line at the vertical center (an honest "no change"
 * indicator, clearly visible against its fill) rather than a fabricated trend or a
 * degenerate line pinned to an edge where it reads as missing. */
export function Sparkline({ data, colorClassName }: { data: number[]; colorClassName: string }) {
  const gradientId = useId();
  if (data.length < 2) return null;

  const w = 100; // viewBox units — the <svg> scales to 100% of its container's width
  const h = 40;
  const padY = 4;
  const max = Math.max(...data);
  const min = Math.min(...data, 0);
  const flat = max === min;
  const range = flat ? 1 : max - min;
  const stepX = w / (data.length - 1);

  const points = data.map((v, i) => ({
    x: i * stepX,
    y: flat ? h / 2 : padY + (1 - (v - min) / range) * (h - padY * 2),
  }));

  // Smooth the polyline into a curve via quadratic beziers through each segment's
  // midpoint — enough to read as a soft trend line without a charting library.
  let line = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    line += ` Q ${prev.x} ${prev.y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  line += ` L ${last.x} ${last.y}`;
  const area = `${line} L ${last.x} ${h} L ${points[0].x} ${h} Z`;

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1" className={colorClassName}>
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} stroke="none" />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={colorClassName}
      />
    </svg>
  );
}
