import { getJson, query } from './client';
import type { HddTicketsReport } from './types';

export const HDD_LOGS_URL = '/api/hdd-tickets/logs';

/** An empty `companyIds` list means every configured agency. */
export function fetchHddTickets(
  companyIds: number[],
  options: { refresh?: boolean; signal?: AbortSignal } = {}
): Promise<HddTicketsReport> {
  const qs = query({
    company_ids: companyIds.length ? companyIds.join(',') : undefined,
    refresh: options.refresh,
  });
  return getJson<HddTicketsReport>(`/api/hdd-tickets${qs}`, { signal: options.signal });
}
