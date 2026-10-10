import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import usePolling from './usePolling';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('usePolling', () => {
  it('calls at once, then on every interval, and stops on unmount', () => {
    const fn = vi.fn();
    const { unmount } = renderHook(() => usePolling(fn, 1000));
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2000);
    expect(fn).toHaveBeenCalledTimes(3);

    unmount();
    vi.advanceTimersByTime(5000);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('restarts with an immediate call when the interval changes', () => {
    const fn = vi.fn();
    const { rerender } = renderHook(({ ms }) => usePolling(fn, ms), {
      initialProps: { ms: 1000 },
    });
    vi.advanceTimersByTime(500);
    rerender({ ms: 5000 });
    expect(fn).toHaveBeenCalledTimes(2);

    // The old 1 s timer is gone; the next call is a full 5 s after the restart.
    vi.advanceTimersByTime(4999);
    expect(fn).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does nothing while disabled and starts with a call once enabled', () => {
    const fn = vi.fn();
    const { rerender } = renderHook(({ on }) => usePolling(fn, 1000, on), {
      initialProps: { on: false },
    });
    vi.advanceTimersByTime(3000);
    expect(fn).not.toHaveBeenCalled();

    rerender({ on: true });
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(2);

    rerender({ on: false });
    vi.advanceTimersByTime(3000);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('accepts an async function and keeps polling while it is pending', () => {
    const fn = vi.fn(() => new Promise<void>(() => undefined));
    renderHook(() => usePolling(fn, 1000));
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
