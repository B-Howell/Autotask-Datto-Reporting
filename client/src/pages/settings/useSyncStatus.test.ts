import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { syncApi } from '@/api';
import type { SyncStatus, SyncTriggerResponse } from '@/api';
import useToastStore from '@/store/toastStore';
import useSyncStatus from './useSyncStatus';

vi.mock('@/api', () => ({
  syncApi: { SYNC_LOGS_URL: '/api/sync/logs', fetchSyncStatus: vi.fn(), triggerSync: vi.fn() },
}));

/** Stands in for the browser's EventSource, which jsdom does not provide. */
class FakeEventSource {
  static opened: FakeEventSource[] = [];
  url: string;
  closed = false;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.opened.push(this);
  }

  close() {
    this.closed = true;
  }

  send(line: string) {
    this.onmessage?.({ data: line } as MessageEvent<string>);
  }
}

const idle: SyncStatus = {
  running: false,
  started_at: null,
  finished_at: null,
  error: null,
  done: 0,
  total: 0,
  current: null,
  last_synced_at: '2026-10-09T19:00:00+00:00',
};
const started: SyncTriggerResponse = { ...idle, started: true, reason: null };

const mocked = vi.mocked(syncApi);

const mounted = async () => {
  mocked.fetchSyncStatus.mockResolvedValue(idle);
  const hook = renderHook(() => useSyncStatus());
  await waitFor(() => expect(hook.result.current.status).toEqual(idle));
  return hook;
};

beforeEach(() => {
  FakeEventSource.opened = [];
  vi.stubGlobal('EventSource', FakeEventSource);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  useToastStore.getState().hideToast();
});

describe('useSyncStatus', () => {
  it('fetches the status once on mount and opens no log stream', async () => {
    await mounted();
    expect(mocked.fetchSyncStatus).toHaveBeenCalledTimes(1);
    expect(FakeEventSource.opened).toHaveLength(0);
  });

  it('opens the log stream before the trigger, keeps its lines and refreshes after', async () => {
    const { result } = await mounted();
    mocked.triggerSync.mockImplementationOnce(async () => {
      expect(FakeEventSource.opened).toHaveLength(1);
      FakeEventSource.opened[0].send('[INFO] Sync starting: 3 steps');
      return started;
    });
    await act(() => result.current.startSync());
    expect(FakeEventSource.opened[0].url).toBe('/api/sync/logs');
    expect(result.current.logs).toEqual(['[INFO] Sync starting: 3 steps']);
    expect(mocked.fetchSyncStatus).toHaveBeenCalledTimes(2);
    expect(useToastStore.getState().open).toBe(false);
  });

  it('toasts why a trigger started nothing', async () => {
    const { result } = await mounted();
    mocked.triggerSync.mockResolvedValueOnce({ ...started, started: false, reason: 'running' });
    await act(() => result.current.startSync());
    expect(useToastStore.getState().severity).toBe('warning');
    expect(useToastStore.getState().message).toBe('Sync skipped: one is already running');

    mocked.triggerSync.mockResolvedValueOnce({
      ...started,
      started: false,
      reason: 'credentials',
    });
    await act(() => result.current.startSync());
    expect(useToastStore.getState().message).toBe(
      'Sync skipped: vendor credentials are not configured'
    );
  });

  it('closes the previous stream when a sync is started again and on unmount', async () => {
    const { result, unmount } = await mounted();
    mocked.triggerSync.mockResolvedValue(started);
    await act(() => result.current.startSync());
    await act(() => result.current.startSync());
    expect(FakeEventSource.opened.map((source) => source.closed)).toEqual([true, false]);
    unmount();
    expect(FakeEventSource.opened[1].closed).toBe(true);
  });
});
