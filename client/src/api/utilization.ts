import { getJson, query } from './client';
import type { UtilizationEntriesResponse, UtilizationReport } from './types';

export const UTILIZATION_LOGS_URL = '/api/agency-utilization/logs';

/** `start` and `end` are inclusive YYYY-MM-DD dates. */
export function fetchUtilizationReport(
  start: string,
  end: string,
  options: { refresh?: boolean; signal?: AbortSignal } = {}
): Promise<UtilizationReport> {
  const qs = query({ start, end, refresh: options.refresh });
  return getJson<UtilizationReport>(`/api/agency-utilization${qs}`, { signal: options.signal });
}

export function fetchUtilizationEntries(
  start: string,
  end: string,
  options: { signal?: AbortSignal } = {}
): Promise<UtilizationEntriesResponse> {
  const qs = query({ start, end });
  return getJson<UtilizationEntriesResponse>(`/api/agency-utilization/entries${qs}`, {
    signal: options.signal,
  });
}
