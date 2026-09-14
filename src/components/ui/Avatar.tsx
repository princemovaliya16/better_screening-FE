import { clsx } from 'clsx';

const AV_COLORS = [
  'from-indigo-500 to-violet-500',
  'from-sky-500 to-blue-600',
  'from-fuchsia-500 to-pink-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-red-500',
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-sky-600',
];

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function avatarColor(name: string) {
  return AV_COLORS[(name.charCodeAt(0) + name.length) % AV_COLORS.length];
}

export function Avatar({
  name,
  size = 36,
  ring,
  className,
}: {
  name: string;
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'shrink-0 rounded-full grid place-items-center font-semibold text-white bg-gradient-to-br shadow-sm',
        avatarColor(name),
        ring && 'ring-2 ring-white',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
