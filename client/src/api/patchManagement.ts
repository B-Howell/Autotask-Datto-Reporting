import { getJson, query } from './client';
import type { PatchReport } from './types';

export const PATCH_LOGS_URL = '/api/patch-management/logs';

export function fetchPatchReport(
  siteId: string,
  options: { refresh?: boolean; signal?: AbortSignal } = {}
): Promise<PatchReport> {
  const qs = query({ site_id: siteId, refresh: options.refresh });
  return getJson<PatchReport>(`/api/patch-management${qs}`, { signal: options.signal });
}
