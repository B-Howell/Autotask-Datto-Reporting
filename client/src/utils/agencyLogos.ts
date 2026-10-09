import useTenantStore from '@/store/tenantStore';

/** The tenant's logo for an agency display name, served by the server; null when none is mapped. */
export const getAgencyLogoUrl = (agencyName: string | null | undefined): string | null =>
  useTenantStore.getState().logoUrl(agencyName);
