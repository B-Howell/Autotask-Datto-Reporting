import { create } from 'zustand';
import type { StoreApi, UseBoundStore } from 'zustand';

export type Updater<T> = T | ((prev: T) => T);

export function applyUpdater<T>(prev: T, next: Updater<T>): T {
  return typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
}

/** State every long-running report shares: its result, in-flight flag, error and log tail. */
export interface ReportDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  logs: string[];
  setData: (data: T | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLogs: (logs: Updater<string[]>) => void;
}

export type ReportDataStore<T> = UseBoundStore<StoreApi<ReportDataState<T>>>;

export function createReportDataStore<T>(): ReportDataStore<T> {
  return create<ReportDataState<T>>()((set) => ({
    data: null,
    loading: false,
    error: null,
    logs: [],
    setData: (data) => set({ data }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    setLogs: (logs) => set((state) => ({ logs: applyUpdater(state.logs, logs) })),
  }));
}
