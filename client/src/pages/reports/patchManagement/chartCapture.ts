export interface ChartPng {
  dataUrl: string;
  width: number;
  height: number;
}

/** Rasterise the first SVG inside `container` so jsPDF can embed it. */
export function captureSvgAsPng(
  container: HTMLElement | null,
  scale = 2
): Promise<ChartPng | null> {
  const svg = container?.querySelector('svg');
  if (!svg) return Promise.resolve(null);
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const rect = svg.getBoundingClientRect();
  const width = rect.width || 320;
  const height = rect.height || 320;
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    new XMLSerializer().serializeToString(clone)
  )}`;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      resolve({ dataUrl: canvas.toDataURL('image/png'), width, height });
    };
    img.onerror = () => resolve(null);
    img.src = svgUrl;
  });
}
