import type { jsPDF } from 'jspdf';
import { isAgencyGroup } from '@/api';
import type { EffectiveAgency, PatchDevice, PatchSummaryItem } from '@/api';
import { fileDateStamp } from '@/utils/dates';
import {
  PDF_ACCENT,
  PDF_BAND,
  PDF_MARGIN,
  drawReportHeader,
  hexToRgb,
  loadPdfLibraries,
} from '@/utils/pdf';
import type { ReportAssets } from '@/utils/reportImages';
import { saveReportBlob } from '@/utils/saveReport';
import type { ChartPng } from './chartCapture';
import { formatReboot } from './formatters';
import { STATUS_COLORS } from './statusColors';

type AutoTable = Awaited<ReturnType<typeof loadPdfLibraries>>['autoTable'];

const CHART_HEIGHT = 150;
const LEGEND_X = PDF_MARGIN + 190;

export interface PatchPdfInput {
  agency: EffectiveAgency;
  summary: PatchSummaryItem[];
  devices: PatchDevice[];
  total: number;
  /** The on-screen donut, already rasterised; null draws the legend alone. */
  chart: ChartPng | null;
  /** The agency logo, already loaded; the header goes without one when missing. */
  assets: ReportAssets;
}

export interface BuiltPdf {
  doc: jsPDF;
  filename: string;
}

const drawSectionLabel = (doc: jsPDF, y: number): number => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...PDF_ACCENT);
  doc.text('PATCH SUMMARY', PDF_MARGIN, y);
  doc.setTextColor(0);
  return y + 12;
};

const drawDonut = (doc: jsPDF, chart: ChartPng, total: number, y: number): void => {
  const width = CHART_HEIGHT * (chart.width / chart.height);
  doc.addImage(chart.dataUrl, 'PNG', PDF_MARGIN, y, width, CHART_HEIGHT, undefined, 'FAST');
  // The capture is the bare SVG; the total in the hole is an HTML overlay on screen.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(30);
  doc.text(String(total), PDF_MARGIN + width / 2, y + CHART_HEIGHT / 2 + 9, { align: 'center' });
  doc.setTextColor(0);
};

/** Returns the Y just below the last legend line. */
const drawLegend = (doc: jsPDF, summary: PatchSummaryItem[], startY: number): number => {
  let y = startY + 18;
  doc.setFontSize(11);
  summary.forEach((s) => {
    doc.setFillColor(...hexToRgb(STATUS_COLORS[s.status]));
    doc.rect(LEGEND_X, y - 8, 10, 10, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    doc.text(`${s.label}:`, LEGEND_X + 16, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_ACCENT);
    doc.text(String(s.count), LEGEND_X + 16 + doc.getTextWidth(`${s.label}:  `), y);
    y += 18;
  });
  doc.setTextColor(0);
  return y;
};

const drawDeviceTable = (
  doc: jsPDF,
  autoTable: AutoTable,
  devices: PatchDevice[],
  startY: number
): void => {
  autoTable(doc, {
    startY,
    head: [
      [
        'Device Name',
        'Description',
        'Last User',
        'Last Reboot',
        'Installed',
        'Approved Pending',
        'Not Approved',
        'Patch Status',
      ],
    ],
    body: devices.map((d) => [
      d.hostname,
      d.description,
      d.last_user || '',
      formatReboot(d.last_reboot),
      String(d.installed),
      String(d.approved_pending),
      String(d.not_approved),
      d.status_label,
    ]),
    headStyles: {
      fillColor: PDF_ACCENT,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: { fontSize: 9, textColor: 30 },
    alternateRowStyles: { fillColor: PDF_BAND },
    styles: { cellPadding: 4, font: 'helvetica' },
    columnStyles: { 4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center' } },
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
    theme: 'grid',
  });
};

export async function buildPatchPdf({
  agency,
  summary,
  devices,
  total,
  chart,
  assets,
}: PatchPdfInput): Promise<BuiltPdf> {
  const { JsPDF, autoTable } = await loadPdfLibraries();
  // compress Flate-encodes every stream, which turns a multi-MB file into a few hundred KB.
  const doc = new JsPDF({ unit: 'pt', format: 'letter', compress: true });
  const agencyName = agency.name;

  const headerBottom = drawReportHeader(
    doc,
    `${agencyName} Patch Management Summary Report`,
    assets.logo ?? null
  );
  const chartTop = drawSectionLabel(doc, headerBottom);
  if (chart) drawDonut(doc, chart, total, chartTop);
  const legendBottom = drawLegend(doc, summary, chartTop);
  drawDeviceTable(doc, autoTable, devices, Math.max(chartTop + CHART_HEIGHT, legendBottom) + 20);

  return { doc, filename: `${agencyName} Patch Management Summary ${fileDateStamp()}.pdf` };
}

/** Upload to Saved Reports; the toast is shown by saveReportBlob either way. */
export async function savePatchPdf(
  { doc, filename }: BuiltPdf,
  agency: EffectiveAgency
): Promise<void> {
  try {
    await saveReportBlob({
      blob: doc.output('blob'),
      filename,
      agencyName: agency.name,
      agencyId: isAgencyGroup(agency) ? '' : agency.id,
      reportType: 'patch',
      format: 'pdf',
      title: filename.replace(/\.pdf$/, ''),
    });
  } catch {
    /* saveReportBlob has already shown the failure toast */
  }
}
