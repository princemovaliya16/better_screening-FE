export function Ring({
  value,
  size = 64,
  stroke = 6,
  tone = '#4f46e5',
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: string;
  label?: false;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef1f6" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.16,1,.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-display font-bold text-ink-900 tabular-nums" style={{ fontSize: size * 0.28 }}>
          {value}
          {label !== false && <span className="text-[0.6em] text-ink-400">%</span>}
        </span>
      </div>
    </div>
  );
}
