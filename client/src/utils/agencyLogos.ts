import useTenantStore from '@/store/tenantStore';

/** The tenant's logo for an agency display name, served by the server; null when none is mapped. */
export const getAgencyLogoUrl = (agencyName: string | null | undefined): string | null =>
  useTenantStore.getState().logoUrl(agencyName);

export interface ImageDimensions {
  width: number;
  height: number;
}

export function loadImageDimensions(url: string): Promise<ImageDimensions | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
