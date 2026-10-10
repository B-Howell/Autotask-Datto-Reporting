import { useEffect } from 'react';

/**
 * Calls `fn` at once and then every `intervalMs` for as long as `enabled`.
 * The timer is cleared on unmount, and rebuilt (with a fresh immediate call)
 * whenever `fn`, the interval or the flag changes, so a caller that wants a
 * faster cadence while something is in flight just passes a different
 * interval. A returned promise is let go; the caller owns its own errors.
 */
export default function usePolling(
  fn: () => void | Promise<void>,
  intervalMs: number,
  enabled = true
): void {
  useEffect(() => {
    if (!enabled) return undefined;
    void fn();
    const timer = setInterval(() => void fn(), intervalMs);
    return () => clearInterval(timer);
  }, [fn, intervalMs, enabled]);
}
