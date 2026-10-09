import { getJson, query } from './client';
import type { TicketDetails } from './types';

export function fetchTicketDetails(
  companyId: number,
  year: number,
  month: number,
  options: { refresh?: boolean; signal?: AbortSignal } = {}
): Promise<TicketDetails> {
  const qs = query({ company_id: companyId, year, month, refresh: options.refresh });
  return getJson<TicketDetails>(`/api/tickets/details${qs}`, { signal: options.signal });
}
