import type { Border, Row, Workbook, Worksheet } from 'exceljs';
import type { UtilizationEntry, UtilizationReport } from '@/api';
import { XLSX_HEADER_FILL, XLSX_ROW_EVEN, loadExcel, workbookToBlob } from '@/utils/excel';
import type { RatedDepartment } from './departments';
import { MONTHS_IN_YEAR } from './fiscalYear';
import { RAW_COLUMNS } from './rawEntries';
import { buildDetail } from './summary';
import type { Summary } from './summary';

const BORDER: Partial<Border> = { style: 'thin', color: { argb: 'FFE2E8F0' } };
const HOURS_FMT = '#,##0.00';
const MONEY_FMT = '$#,##0';
const RAW_COLUMN_WIDTHS = [12, 32, 18, 52, 22, 13, 26];
const SHEET_NAME_LIMIT = 31;

const styleHeader = (row: Row): void => {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  row.alignment = { vertical: 'middle' };
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_HEADER_FILL } };
    cell.border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };
  });
  row.height = 18;
};

const band = (row: Row): void =>
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_ROW_EVEN } };
  });

const totalRow = (row: Row): void => {
  row.font = { bold: true };
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.border = { ...cell.border, top: { style: 'double', color: { argb: 'FF94A3B8' } } };
  });
};

// Built first so the raw data is the leftmost tab.
const addRawSheet = (wb: Workbook, entries: UtilizationEntry[]): void => {
  const sheet = wb.addWorksheet('Datto', { views: [{ state: 'frozen', ySplit: 1 }] });
  styleHeader(sheet.addRow(RAW_COLUMNS.map((c) => c.label)));
  entries.forEach((e, i) => {
    const row = sheet.addRow(RAW_COLUMNS.map((c) => e[c.key]));
    if (i % 2) band(row);
  });
  sheet.columns.forEach((col, i) => {
    col.width = RAW_COLUMN_WIDTHS[i] || 14;
  });
  sheet.getColumn(6).numFmt = HOURS_FMT;
  sheet.getColumn(6).alignment = { horizontal: 'right' };
  sheet.autoFilter = { from: 'A1', to: { row: 1, column: RAW_COLUMNS.length } };
};

const addSummaryHeader = (sheet: Worksheet, companies: string[]): void => {
  const top = sheet.addRow(['Department', 'Rate', ...companies.flatMap((c) => [c, ''])]);
  const sub = sheet.addRow([
    '',
    '',
    ...companies.flatMap(() => ['Hours per month', 'Cost per month']),
  ]);
  styleHeader(top);
  styleHeader(sub);
  // Each agency spans its two figures, so the name sits over both.
  companies.forEach((_, i) => {
    const col = 3 + i * 2;
    sheet.mergeCells(1, col, 1, col + 1);
    sheet.getCell(1, col).alignment = { horizontal: 'center' };
  });
  sheet.mergeCells(1, 1, 2, 1);
  sheet.mergeCells(1, 2, 2, 2);
};

const addSummarySheet = (wb: Workbook, summary: Summary, companies: string[]): void => {
  const sheet = wb.addWorksheet('Summary', {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 2 }],
  });
  addSummaryHeader(sheet, companies);
  summary.perDept.forEach((d, i) => {
    const row = sheet.addRow([
      d.department,
      d.rate,
      ...companies.flatMap((c) => [d.byCompany[c].hours, d.byCompany[c].cost]),
    ]);
    if (i % 2) band(row);
  });
  totalRow(
    sheet.addRow([
      'Total',
      '',
      ...companies.flatMap((c) => [summary.totals[c].hours, summary.totals[c].cost]),
    ])
  );
  sheet.getColumn(1).width = 26;
  sheet.getColumn(2).width = 8;
  companies.forEach((_, i) => {
    const col = 3 + i * 2;
    sheet.getColumn(col).width = 16;
    sheet.getColumn(col).numFmt = HOURS_FMT;
    sheet.getColumn(col + 1).width = 15;
    sheet.getColumn(col + 1).numFmt = MONEY_FMT;
  });
};

// Excel caps sheet names at 31 characters, rejects several punctuation marks,
// and refuses duplicates. Two agencies sharing their first 31 characters threw
// and lost the whole export, so colliding names are numbered.
const sheetNamer = () => {
  const used = new Set<string>();
  return (company: string): string => {
    const base = company.replace(/[\\*?:[\]/]/g, '-').slice(0, SHEET_NAME_LIMIT);
    let candidate = base;
    for (let n = 2; used.has(candidate); n += 1) {
      const suffix = ` (${n})`;
      candidate = base.slice(0, SHEET_NAME_LIMIT - suffix.length) + suffix;
    }
    used.add(candidate);
    return candidate;
  };
};

const addAgencySheet = (
  wb: Workbook,
  sheetName: string,
  company: string,
  utilData: UtilizationReport,
  departments: RatedDepartment[]
): void => {
  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 2 }] });
  ws.addRow([company, '', '']).font = { bold: true, size: 13 };
  styleHeader(ws.addRow(['Resource', '1 Year', 'Avg Monthly']));

  let grand = 0;
  buildDetail(utilData, company, departments).forEach((d) => {
    grand += d.total;
    const head = ws.addRow([d.department, d.total, d.total / MONTHS_IN_YEAR]);
    head.font = { bold: true };
    band(head);
    d.workers.forEach((w) => {
      const row = ws.addRow([w.worker, w.hours, w.hours / MONTHS_IN_YEAR]);
      row.getCell(1).alignment = { indent: 2 };
    });
  });
  totalRow(ws.addRow(['Total', grand, grand / MONTHS_IN_YEAR]));

  ws.getColumn(1).width = 34;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 14;
  ws.getColumn(2).numFmt = HOURS_FMT;
  ws.getColumn(3).numFmt = HOURS_FMT;
};

export const annualWorkbookFilename = (utilData: UtilizationReport): string =>
  `Annual Utilization ${utilData.periodLabel || `${utilData.start} to ${utilData.end}`}.xlsx`;

export interface AnnualWorkbookInput {
  utilData: UtilizationReport;
  summary: Summary;
  companies: string[];
  departments: RatedDepartment[];
  entries: UtilizationEntry[];
}

/** The Datto raw sheet, the summary, then one detail sheet per agency. */
export const buildAnnualWorkbook = async ({
  utilData,
  summary,
  companies,
  departments,
  entries,
}: AnnualWorkbookInput): Promise<Blob> => {
  const ExcelJS = await loadExcel();
  const wb = new ExcelJS.Workbook();
  addRawSheet(wb, entries);
  addSummarySheet(wb, summary, companies);
  const nameFor = sheetNamer();
  companies.forEach((company) => {
    addAgencySheet(wb, nameFor(company), company, utilData, departments);
  });
  return workbookToBlob(wb);
};
