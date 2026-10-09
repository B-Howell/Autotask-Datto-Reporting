import { create } from 'zustand';
import type { TenantSettings } from '@/api';

export const TENANT_DEFAULTS: TenantSettings = {
  groups: [],
  logos: {},
  ratedDepartments: [
    { department: 'Administration', rate: 0 },
    { department: 'Call Center', rate: 65 },
    { department: 'Help Desk', rate: 75 },
    { department: 'Jr Sys Admin', rate: 80 },
    { department: 'Sr Sys Admin', rate: 90 },
  ],
  firstReportYear: 2024,
  earliestQuarterYear: 2023,
};

interface TenantState {
  tenant: TenantSettings;
  loaded: boolean;
  setTenant: (tenant: TenantSettings) => void;
  logoUrl: (agencyName: string | null | undefined) => string | null;
}

/** Deployment settings fetched once at startup; the defaults match the server's. */
const useTenantStore = create<TenantState>()((set, get) => ({
  tenant: TENANT_DEFAULTS,
  loaded: false,
  setTenant: (tenant) => set({ tenant, loaded: true }),
  logoUrl: (agencyName) => {
    if (!agencyName) return null;
    const file = get().tenant.logos[agencyName];
    return file ? `/api/tenant/logos/${encodeURIComponent(file)}` : null;
  },
}));

export default useTenantStore;
