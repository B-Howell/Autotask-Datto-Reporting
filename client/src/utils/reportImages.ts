// Images an export embeds, resolved to bytes and dimensions before the
// builder runs. The builders stay pure (data and images in, file out) so the
// same code can produce a report in the browser or under Node, where there is
// no Image element or canvas to measure a file with.
import { getAgencyLogoUrl } from './agencyLogos';
import { OFFICE_ICON, WINDOWS_ICON, fetchAssetBytes } from './assets';

/** An image ready for both docx (bytes + size) and jsPDF (data url + size). */
export interface ReportImage {
  bytes: ArrayBuffer;
  dataUrl: string;
  width: number;
  height: number;
  format: 'PNG' | 'JPEG';
}

/** Images an export may embed. Every field is optional; a missing image is skipped. */
export interface ReportAssets {
  officeIcon?: ReportImage | null;
  windowsIcon?: ReportImage | null;
  logo?: ReportImage | null;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
// The first chunk of every PNG is IHDR; its tag sits right after the signature
// and the chunk length, and its width and height follow the tag.
const IHDR_TAG = 'IHDR';
const IHDR_TAG_OFFSET = 12;

/**
 * Width and height from the IHDR chunk; null when the bytes are not a PNG,
 * the first chunk is not IHDR, or either dimension is zero.
 */
export function pngDimensions(bytes: ArrayBuffer): { width: number; height: number } | null {
  const view = new DataView(bytes);
  if (view.byteLength < 24) return null;
  for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
    if (view.getUint8(i) !== PNG_SIGNATURE[i]) return null;
  }
  for (let i = 0; i < IHDR_TAG.length; i += 1) {
    if (view.getUint8(IHDR_TAG_OFFSET + i) !== IHDR_TAG.charCodeAt(i)) return null;
  }
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  return width > 0 && height > 0 ? { width, height } : null;
}

export function toDataUrl(bytes: ArrayBuffer, mime: string): string {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return `data:${mime};base64,${btoa(binary)}`;
}

/** A PNG from raw bytes, or null when the bytes are not a PNG. */
export function pngImage(bytes: ArrayBuffer | null): ReportImage | null {
  if (!bytes) return null;
  const dims = pngDimensions(bytes);
  if (!dims) return null;
  return { bytes, dataUrl: toDataUrl(bytes, 'image/png'), ...dims, format: 'PNG' };
}

/** Fetch the icons and the agency logo the way the browser always has. */
export async function loadBrowserAssets(agencyName: string | null): Promise<ReportAssets> {
  const logoUrl = getAgencyLogoUrl(agencyName);
  const [office, windows, logo] = await Promise.all([
    fetchAssetBytes(OFFICE_ICON),
    fetchAssetBytes(WINDOWS_ICON),
    logoUrl ? fetchAssetBytes(logoUrl) : Promise.resolve(null),
  ]);
  const logoImage = pngImage(logo);
  if (logoUrl && !logoImage) {
    console.warn('Agency logo is not a PNG and was skipped:', logoUrl);
  }
  return { officeIcon: pngImage(office), windowsIcon: pngImage(windows), logo: logoImage };
}
