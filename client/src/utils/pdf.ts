import type { jsPDF } from 'jspdf';
import { longDate } from './dates';
import type { ReportImage } from './reportImages';

export const PDF_MARGIN = 40;
/** The blue used for headers in every export format. */
export const PDF_ACCENT: [number, number, number] = [29, 78, 216];
export const PDF_BAND: [number, number, number] = [248, 250, 252];

export async function loadPdfLibraries() {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  return { JsPDF, autoTable };
}

/**
 * Draws the optional logo, the title and the date; returns the Y position where
 * the page content should start. The logo is supplied by the caller so this
 * runs anywhere jsPDF does.
 */
export function drawReportHeader(doc: jsPDF, title: string, logo: ReportImage | null): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = PDF_MARGIN;

  if (logo) {
    const maxLogoHeight = 50;
    const h = Math.min(maxLogoHeight, logo.height);
    const w = h * (logo.width / logo.height);
    doc.addImage(logo.dataUrl, logo.format, (pageWidth - w) / 2, y, w, h, undefined, 'FAST');
    y += h + 14;
  }

  // Shrink long titles a little, then wrap, so an agency name never runs off the page.
  const maxTitleWidth = pageWidth - PDF_MARGIN * 2;
  doc.setFont('helvetica', 'bold');
  let fontSize = 18;
  doc.setFontSize(fontSize);
  while (fontSize > 12 && doc.getTextWidth(title) > maxTitleWidth * 2) {
    fontSize -= 1;
    doc.setFontSize(fontSize);
  }
  const lines = doc.splitTextToSize(title, maxTitleWidth) as string[];
  y += 10;
  for (const line of lines) {
    doc.text(line, pageWidth / 2, y, { align: 'center' });
    y += fontSize * 1.2;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.text(longDate(), pageWidth / 2, y + 2, { align: 'center' });
  return y + 30;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

/** Where the last autoTable ended; the plugin stores this on the document. */
export function lastTableBottom(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 0;
}
