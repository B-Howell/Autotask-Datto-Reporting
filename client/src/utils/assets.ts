// Static files served from /public (report icons, agency logos). A missing
// file is not an error for an export; the section just renders without its icon.

export async function fetchAssetBytes(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function fetchAssetDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export const OFFICE_ICON = '/Office.png';
export const WINDOWS_ICON = '/Windows.png';
