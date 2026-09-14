import { clsx } from 'clsx';

export function Toggle({
  checked,
  onChange,
  size = 'md',
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
}) {
  const w = size === 'sm' ? 'w-9 h-5' : 'w-11 h-6';
  const dot = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const translate = size === 'sm' ? 'translate-x-4' : 'translate-x-5';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative rounded-full transition-colors shrink-0 disabled:opacity-50 disabled:pointer-events-none',
        w,
        checked ? 'ai-gradient' : 'bg-ink-200',
      )}
    >
      <span
        className={clsx(
          'absolute top-0.5 left-0.5 bg-white rounded-full shadow transition-transform',
          dot,
          checked && translate,
        )}
      />
    </button>
  );
}
