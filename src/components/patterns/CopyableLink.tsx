import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';

/** Copies text to the clipboard. `navigator.clipboard` only exists on secure origins
 * (https / localhost), so fall back to a hidden textarea + execCommand elsewhere —
 * e.g. when the app is opened by IP on the LAN. */
async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through to the legacy path */
    }
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

/**
 * A read-only link field with a Copy button. Clicking the field selects the whole
 * link so it can also be copied manually if the clipboard is blocked.
 */
export function CopyableLink({ url, className }: { url: string; className?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state === 'idle') return;
    const timeout = setTimeout(() => setState('idle'), 2000);
    return () => clearTimeout(timeout);
  }, [state]);

  const handleCopy = async () => {
    const ok = await copyText(url);
    if (!ok) inputRef.current?.select();
    setState(ok ? 'copied' : 'failed');
  };

  return (
    <div className={clsx('w-full max-w-xl', className)}>
      <div className="flex items-stretch rounded-lg border border-ink-200 bg-white overflow-hidden focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10">
        <span className="grid place-items-center pl-3 text-[13px]" aria-hidden>
          🔗
        </span>
        <input
          ref={inputRef}
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          onClick={(e) => e.currentTarget.select()}
          aria-label="Interview join link"
          className="flex-1 min-w-0 h-9 px-2.5 text-[13px] text-ink-700 bg-transparent outline-none truncate"
        />
        <button
          type="button"
          onClick={handleCopy}
          className={clsx(
            'shrink-0 px-3.5 text-[13px] font-semibold border-l border-ink-200 transition-colors',
            state === 'copied'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-ink-50 text-ink-700 hover:bg-ink-100',
          )}
        >
          {state === 'copied' ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      {state === 'failed' && (
        <p className="text-[12px] text-rose-500 mt-1.5 text-left">
          Couldn't copy automatically — the link is selected, press Ctrl+C.
        </p>
      )}
    </div>
  );
}
