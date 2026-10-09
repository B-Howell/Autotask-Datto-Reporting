// Agency display name -> logo file served from /public. Agencies with no entry
// render without a logo.
const LOGO_MAP: Record<string, string> = {};

export function getAgencyLogoUrl(agencyName: string | null | undefined): string | null {
  if (!agencyName) return null;
  return LOGO_MAP[agencyName] ?? null;
}

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
