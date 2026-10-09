import { getJson, query } from './client';
import type { OfficeWindowsBreakdown } from './types';

export function fetchOfficeWindowsBreakdown(
  companyId: number,
  siteId: string,
  options: { refresh?: boolean; signal?: AbortSignal } = {}
): Promise<OfficeWindowsBreakdown> {
  const qs = query({ company_id: companyId, site_id: siteId, refresh: options.refresh });
  return getJson<OfficeWindowsBreakdown>(`/api/office-windows/breakdown${qs}`, {
    signal: options.signal,
  });
}

export function officeWindowsLogsUrl(companyId: number, siteId: string): string {
  return `/api/office-windows/breakdown/logs${query({ company_id: companyId, site_id: siteId })}`;
}
