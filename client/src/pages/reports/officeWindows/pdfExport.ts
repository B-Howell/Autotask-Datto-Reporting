import type { jsPDF } from 'jspdf';
import type { CellHookData, Styles, UserOptions } from 'jspdf-autotable';
import {
  PDF_ACCENT,
  PDF_BAND,
  PDF_MARGIN,
  drawReportHeader,
  lastTableBottom,
  loadPdfLibraries,
} from '@/utils/pdf';
import type { ReportAssets } from '@/utils/reportImages';
import { reportFilename, reportTitle } from './reportRows';
import type { ReportRow } from './reportRows';

// Icon in points, sized to sit beside the 14pt section title.
const ICON_SIZE = 16;
const ICON_GAP = 6;
const TITLE_TO_TABLE = 8;
const TABLE_TO_NEXT_TITLE = 28;

const headAndBody = (rows: ReportRow[], showLicenses: boolean, withAvailable: boolean) => {
  const head = ['Product', 'Installs'];
  if (showLicenses) {
    head.push('Licenses');
    if (withAvailable) head.push('Available');
  }
  const body = rows.map((r) => {
    // jsPDF-autotable has no per-cell indent either, so nested variants are
    // prefixed to sit under their family heading.
    const row = [r.isChild ? `   ${r.name}` : r.name, String(r.installs ?? '')];
    if (showLicenses) {
      row.push(r.license || '');
      if (withAvailable) row.push(r.available || '');
    }
    return row;
  });
  return { head: [head], body };
};

// Product left, every figure column centred.
const columnStyle = (index: number): Partial<Styles> => ({
  halign: index === 0 ? 'left' : 'center',
});

const columnStyles = (columnCount: number): UserOptions['columnStyles'] =>
  Object.fromEntries(Array.from({ length: columnCount }, (_, i) => [i, columnStyle(i)]));

const tableStyle = (columnCount: number): UserOptions => ({
  headStyles: { fillColor: PDF_ACCENT, textColor: 255, fontStyle: 'bold', halign: 'left' },
  bodyStyles: { textColor: 20 },
  alternateRowStyles: { fillColor: PDF_BAND },
  styles: { font: 'helvetica', fontSize: 11, cellPadding: 6 },
  columnStyles: columnStyles(columnCount),
  theme: 'grid',
  margin: { left: PDF_MARGIN, right: PDF_MARGIN },
});

const drawSectionTitle = (doc: jsPDF, text: string, y: number, iconDataUrl: string | null) => {
  let x = PDF_MARGIN;
  if (iconDataUrl) {
    // Pulled up slightly so the icon visually centres on the text baseline.
    doc.addImage(iconDataUrl, 'PNG', x, y - ICON_SIZE + 2, ICON_SIZE, ICON_SIZE, undefined, 'FAST');
    x += ICON_SIZE + ICON_GAP;
  }
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(text, x, y);
};

export interface OfficeWindowsPdfInput {
  agencyName: string;
  officeRows: ReportRow[];
  osRows: ReportRow[];
  showLicenses: boolean;
  /** Icons and logo already loaded; any missing image is left out of the document. */
  assets: ReportAssets;
}

/** Same content and styling as the Word export. */
export const buildOfficeWindowsPdf = async ({
  agencyName,
  officeRows,
  osRows,
  showLicenses,
  assets,
}: OfficeWindowsPdfInput): Promise<{ doc: jsPDF; filename: string }> => {
  const { JsPDF, autoTable } = await loadPdfLibraries();
  // compress: true Flate-compresses all PDF streams, which keeps the file small.
  const doc = new JsPDF({ unit: 'pt', format: 'letter', compress: true });
  let y = drawReportHeader(doc, reportTitle(agencyName), assets.logo ?? null);

  drawSectionTitle(doc, 'Office', y, assets.officeIcon?.dataUrl ?? null);
  const office = headAndBody(officeRows, showLicenses, true);
  autoTable(doc, {
    startY: y + TITLE_TO_TABLE,
    ...office,
    ...tableStyle(office.head[0].length),
    didParseCell: (data: CellHookData) => {
      if (data.section === 'body' && officeRows[data.row.index]?.isGroup) {
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  y = lastTableBottom(doc) + TABLE_TO_NEXT_TITLE;
  drawSectionTitle(doc, 'Windows Installs', y, assets.windowsIcon?.dataUrl ?? null);
  const os = headAndBody(osRows, showLicenses, false);
  autoTable(doc, { startY: y + TITLE_TO_TABLE, ...os, ...tableStyle(os.head[0].length) });

  return { doc, filename: reportFilename(agencyName, 'pdf') };
};
