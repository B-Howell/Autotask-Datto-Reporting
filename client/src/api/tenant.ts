import { getJson } from './client';
import type { TenantSettings } from './types';

export function fetchTenant(): Promise<TenantSettings> {
  return getJson<TenantSettings>('/api/tenant');
}
