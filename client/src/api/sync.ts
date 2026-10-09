import { getJson, postJson } from './client';
import type { SyncStatus, SyncTriggerResponse } from './types';

export const SYNC_LOGS_URL = '/api/sync/logs';

export function fetchSyncStatus(): Promise<SyncStatus> {
  return getJson<SyncStatus>('/api/sync/status');
}

export function triggerSync(): Promise<SyncTriggerResponse> {
  return postJson<SyncTriggerResponse>('/api/sync');
}
