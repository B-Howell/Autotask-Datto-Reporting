export interface CompressedImage {
  dataUrl: string;
  width: number;
  height: number;
  format: 'JPEG';
}

interface CompressOptions {
  maxHeightPx?: number;
  quality?: number;
  background?: string;
}

// jsPDF can fall back to storing raw uncompressed pixels for PNGs with an alpha
// channel, which turns a logo into megabytes. Drawing it onto a small canvas
// over white and re-encoding as JPEG avoids that path entirely.
export function loadCompressedImage(
  url: string,
  { maxHeightPx = 120, quality = 0.85, background = '#ffffff' }: CompressOptions = {}
): Promise<CompressedImage | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const scale = Math.min(1, maxHeightPx / img.naturalHeight);
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', quality),
        width: img.naturalWidth,
        height: img.naturalHeight,
        format: 'JPEG',
      });
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
