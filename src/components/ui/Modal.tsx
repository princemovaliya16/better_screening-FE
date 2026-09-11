import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
}

const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export function Modal({ open, onClose, title, subtitle, size = 'md', children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4">
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={`relative w-full bg-white rounded-2xl shadow-xl border border-ink-200/50 max-h-[92vh] flex flex-col ${sizes[size]}`}
      >
        {(title ?? subtitle) && (
          <div className="flex items-start gap-3.5 p-5 border-b border-ink-100">
            <div className="flex-1 min-w-0">
              {title && <h3 className="font-bold text-[17px] text-ink-900 leading-tight">{title}</h3>}
              {subtitle && <p className="text-[13px] text-ink-500 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 grid place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-600 transition-colors shrink-0"
            >
              ✕
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
