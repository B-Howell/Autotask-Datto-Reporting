import type { Row, Worksheet } from 'exceljs';
import type { UtilizationReport, UtilizationRow } from '@/api';
import {
  XLSX_HEADER_FILL,
  XLSX_PARENT_FILL,
  bandFill,
  loadExcel,
  styleBodyRow,
  styleHeaderRow,
  workbookToBlob,
} from '@/utils/excel';
import { groupRowsByCategory } from './grouping';

type CellValue = string | number;

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** The server names the range (a quarter, or the Sep-Aug year); fall back to raw dates. */
export const periodLabel = (report: UtilizationReport): string =>
  report.periodLabel || `${report.start} to ${report.end}`;

export const utilizationExportFilename = (report: UtilizationReport): string =>
  `Agency Utilization ${periodLabel(report)}.xlsx`;

const writeBodyRow = (
  ws: Worksheet,
  values: CellValue[],
  { bold = false, fill }: { bold?: boolean; fill: string }
): Row => {
  const row = ws.addRow(values);
  styleBodyRow(row, { fill, bold });
  row.eachCell((cell, colNumber) => {
    if (colNumber > 2 && typeof cell.value === 'number') {
      cell.numFmt = '0.##';
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    }
  });
  return row;
};

/** Hours per company followed by their rounded sum, blanks where there are none. */
const hoursCells = (companies: string[], byCompany: Record<string, number>): CellValue[] => {
  let total = 0;
  const cells = companies.map((c) => {
    const v = byCompany[c] || 0;
    total += v;
    return v ? v : '';
  });
  return [...cells, total ? round2(total) : ''];
};

const writeCategory = (
  ws: Worksheet,
  report: UtilizationReport,
  category: string,
  workers: UtilizationRow[]
): void => {
  const { companies } = report;
  writeBodyRow(
    ws,
    [category, '', ...hoursCells(companies, report.categoryTotals[category] || {})],
    {
      bold: true,
      fill: XLSX_PARENT_FILL,
    }
  );
  workers.forEach((wr, idx) => {
    writeBodyRow(ws, ['', wr.worker, ...hoursCells(companies, wr.byCompany)], {
      fill: bandFill(idx),
    });
  });
};

const writeGrandTotal = (ws: Worksheet, report: UtilizationReport): void => {
  const values: CellValue[] = [
    'Grand Total',
    '',
    ...report.companies.map((c) => report.companyTotals[c] || ''),
    report.grandTotal || '',
  ];
  const row = writeBodyRow(ws, values, { bold: true, fill: XLSX_HEADER_FILL });
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });
};

/** One sheet named after the period: category rows with their workers, then a grand total. */
export async function buildQuarterlyWorkbook(report: UtilizationReport): Promise<Blob> {
  const ExcelJS = await loadExcel();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(periodLabel(report), { views: [{ state: 'frozen', ySplit: 1 }] });

  const headers = ['Department', 'Resource', ...report.companies, 'Grand Total'];
  ws.addRow(headers);
  styleHeaderRow(ws.getRow(1));

  const rowsByCategory = groupRowsByCategory(report.rows);
  for (const category of report.categories) {
    writeCategory(ws, report, category, rowsByCategory[category] || []);
  }
  writeGrandTotal(ws, report);

  ws.columns = headers.map((h, i) => ({ width: i < 2 ? 28 : Math.max(h.length + 4, 14) }));
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
  return workbookToBlob(wb);
}
