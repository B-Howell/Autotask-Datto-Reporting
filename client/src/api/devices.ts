import { getJson, postJson, query } from './client';
import type { DeviceChange, DeviceSheetResponse, DeviceUpdateResult } from './types';

export function fetchDeviceSheet(
  companyId: number,
  siteId: string,
  options: { refresh?: boolean; signal?: AbortSignal } = {}
): Promise<DeviceSheetResponse> {
  const qs = query({ company_id: companyId, site_id: siteId, refresh: options.refresh });
  return getJson<DeviceSheetResponse>(`/api/devices${qs}`, { signal: options.signal });
}

export function deviceLogsUrl(companyId: number, siteId: string): string {
  return `/api/devices/logs${query({ company_id: companyId, site_id: siteId })}`;
}

export function updateDevices(changes: DeviceChange[]): Promise<DeviceUpdateResult> {
  return postJson<DeviceUpdateResult>('/api/devices/update', { changes });
}
