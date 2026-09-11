export function Logo({ size = 34 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div
        className="rounded-xl ai-gradient grid place-items-center shadow-md shadow-violet-500/30"
        style={{ width: size, height: size }}
      >
        <svg
          width={size * 0.56}
          height={size * 0.56}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Z" />
        </svg>
      </div>
      <span
        className="font-extrabold tracking-tight text-ink-900"
        style={{ fontFamily: 'var(--font-display)', fontSize: size * 0.56 }}
      >
        Better<span className="ai-text">Screening</span>
      </span>
    </div>
  );
}
