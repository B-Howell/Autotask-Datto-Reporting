import { getJson, query } from './client';
import type { SlaReport } from './types';

export const SLA_LOGS_URL = '/api/sla-performance/logs';

export function fetchSlaReport(
  year: number,
  month: number,
  options: { refresh?: boolean; signal?: AbortSignal } = {}
): Promise<SlaReport> {
  const qs = query({ year, month, refresh: options.refresh });
  return getJson<SlaReport>(`/api/sla-performance${qs}`, { signal: options.signal });
}
