import { useEffect, useRef, useState } from 'react';

/** Ticks down to `deadlineIso` every second and calls `onExpire` once when it's
 * reached — this drives the whole-round assessment timer, not a per-question one. */
export function useCountdown(deadlineIso: string | null, onExpire: () => void) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!deadlineIso) {
      setRemainingMs(null);
      return;
    }
    expiredRef.current = false;
    const deadline = new Date(deadlineIso).getTime();

    const tick = () => {
      const remaining = deadline - Date.now();
      setRemainingMs(Math.max(0, remaining));
      if (remaining <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current();
      }
    };
    const interval = setInterval(tick, 1000);
    tick(); // also run once immediately so the UI doesn't wait a full second to show a value
    return () => clearInterval(interval);
  }, [deadlineIso]);

  const formatted = (() => {
    if (remainingMs == null) return '--:--';
    const totalSeconds = Math.floor(remainingMs / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  })();

  return { remainingMs, formatted, isLow: remainingMs != null && remainingMs < 60_000 };
}
