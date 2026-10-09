// Static files served from /public (report icons) and the tenant logo route. A
// missing file is not an error for an export; the section just renders without
// its icon.

export async function fetchAssetBytes(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export const OFFICE_ICON = '/Office.png';
export const WINDOWS_ICON = '/Windows.png';
