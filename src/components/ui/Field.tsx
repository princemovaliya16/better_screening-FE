import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  error?: string;
  children: ReactNode;
}

export function Field({ label, error, children }: FieldProps) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-ink-700 mb-1.5">{label}</span>
      {children}
      {error && <span className="block text-xs text-rose-500 mt-1">{error}</span>}
    </label>
  );
}
