import { useCallback, useEffect, useRef, useState } from 'react';
import { syncApi } from '@/api';
import type { SyncStatus } from '@/api';
import usePolling from '@/hooks/usePolling';

const IDLE_STATUS: SyncStatus = {
  running: false,
  started_at: null,
  finished_at: null,
  error: null,
  done: 0,
  total: 0,
  current: null,
  last_synced_at: null,
};

const POLL_MS = 1500;

/** Sync status (polled while a sync runs) plus the live log stream of the sync we started. */
const useSyncStatus = () => {
  const [status, setStatus] = useState<SyncStatus>(IDLE_STATUS);
  const [logs, setLogs] = useState<string[]>([]);
  const logSourceRef = useRef<EventSource | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStatus(await syncApi.fetchSyncStatus());
    } catch {
      /* ignore transient errors */
    }
  }, []);

  // One fetch on mount says whether a sync is already running; the log stream
  // opened by startSync is closed when the page is left.
  useEffect(() => {
    void refresh();
    return () => logSourceRef.current?.close();
  }, [refresh]);

  // Poll only while running, so the button re-enables as soon as the sync ends.
  usePolling(refresh, POLL_MS, status.running);

  const startSync = async () => {
    setLogs([]);
    // Open the log stream before triggering so the first lines are not missed.
    if (logSourceRef.current) logSourceRef.current.close();
    const src = new EventSource(syncApi.SYNC_LOGS_URL);
    src.onmessage = (e: MessageEvent<string>) => setLogs((prev) => [...prev, e.data]);
    src.onerror = () => src.close();
    logSourceRef.current = src;
    try {
      await syncApi.triggerSync();
    } catch (err) {
      console.error('Sync failed to start', err);
    }
    void refresh();
  };

  return { status, logs, startSync };
};

export default useSyncStatus;
