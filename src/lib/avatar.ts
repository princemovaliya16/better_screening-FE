/** Deterministic, decorative-only avatar styling derived from a real string (a name,
 * department, id) — same input always maps to the same color, so a given person/
 * department reads consistently across the app without us persisting a color choice. */

const PALETTE = [
  { bg: 'bg-violet-500', tint: 'bg-violet-50 text-violet-700' },
  { bg: 'bg-sky-500', tint: 'bg-sky-50 text-sky-700' },
  { bg: 'bg-amber-500', tint: 'bg-amber-50 text-amber-700' },
  { bg: 'bg-rose-500', tint: 'bg-rose-50 text-rose-700' },
  { bg: 'bg-emerald-500', tint: 'bg-emerald-50 text-emerald-700' },
  { bg: 'bg-fuchsia-500', tint: 'bg-fuchsia-50 text-fuchsia-700' },
];

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h << 5) - h + value.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function paletteFor(seed: string) {
  return PALETTE[hashString(seed) % PALETTE.length];
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}
