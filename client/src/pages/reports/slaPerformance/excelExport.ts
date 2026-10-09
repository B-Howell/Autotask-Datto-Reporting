import type { Row, Workbook, Worksheet } from 'exceljs';
import type { SlaPivotRow, SlaTicket } from '@/api';
import { MONTH_NAMES, parseUsDate } from '@/utils/dates';
import {
  XLSX_PARENT_FILL,
  bandFill,
  loadExcel,
  styleBodyRow,
  styleGrandTotalRow,
  styleHeaderRow,
  workbookToBlob,
} from '@/utils/excel';
import { COLUMNS, DATE_KEYS } from './columns';
import type { SlaColumn } from './columns';
import { GRAND_TOTAL } from './pivots';
import type { IssueTypePivotRow } from './pivots';

type SheetValue = string | number | boolean | Date;

const FROZEN_HEADER = { views: [{ state: 'frozen' as const, ySplit: 1 }] };
const MET_YES_COLOR = 'FF15803D';
const MET_NO_COLOR = 'FFB91C1C';
const PIVOT_VALUE_KEYS = ['fr', 'res', 'cnt'];

export interface SlaWorkbookInput {
  tickets: SlaTicket[];
  pivot: SlaPivotRow[];
  pivotByPriority: SlaPivotRow[];
  pivotByIssueType: IssueTypePivotRow[];
}

export const slaExportFilename = (month: number, year: number): string =>
  `SLA Performance By Ticket ${MONTH_NAMES[month - 1]}${year}.xlsx`;

const ticketCellValue = (t: SlaTicket, col: SlaColumn): SheetValue => {
  const raw = t[col.key];
  if (DATE_KEYS.has(col.key)) return parseUsDate(raw) || raw || '';
  if (col.met) return raw === null || raw === undefined ? '' : raw ? 'Yes' : 'No';
  return raw ?? '';
};

const colourMetCells = (row: Row): void => {
  COLUMNS.forEach((col, i) => {
    if (!col.met) return;
    const cell = row.getCell(i + 1);
    if (cell.value === 'Yes') {
      cell.font = { ...(cell.font || {}), color: { argb: MET_YES_COLOR }, bold: true };
    } else if (cell.value === 'No') {
      cell.font = { ...(cell.font || {}), color: { argb: MET_NO_COLOR }, bold: true };
    }
    cell.alignment = { ...(cell.alignment || {}), horizontal: 'center' };
  });
};

const addReportSheet = (wb: Workbook, tickets: SlaTicket[]): void => {
  const ws = wb.addWorksheet('Report', FROZEN_HEADER);
  ws.columns = COLUMNS.map((col) => ({
    header: col.label,
    key: col.key,
    width: Math.min(Math.max((col.label || '').length + 4, 14), 40),
  }));
  styleHeaderRow(ws.getRow(1));
  COLUMNS.forEach((col, i) => {
    if (DATE_KEYS.has(col.key)) ws.getColumn(i + 1).numFmt = 'mm/dd/yyyy';
    if (col.numeric) ws.getColumn(i + 1).numFmt = '0.##';
  });
  tickets.forEach((t, idx) => {
    const rowData: Record<string, SheetValue> = {};
    COLUMNS.forEach((col) => {
      rowData[col.key] = ticketCellValue(t, col);
    });
    const row = ws.addRow(rowData);
    styleBodyRow(row, { fill: bandFill(idx) });
    colourMetCells(row);
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };
};

const addPivotColumns = (ws: Worksheet, rowLabel: string, labelWidth: number): void => {
  ws.columns = [
    { header: rowLabel, key: 'label', width: labelWidth },
    { header: 'Avg First Response Met', key: 'fr', width: 26 },
    { header: 'Avg Resolved Met', key: 'res', width: 22 },
    { header: 'Tickets', key: 'cnt', width: 14 },
  ];
  styleHeaderRow(ws.getRow(1));
  ws.getColumn(2).numFmt = '0.0%';
  ws.getColumn(3).numFmt = '0.0%';
  ws.getColumn(4).numFmt = '0';
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 4 } };
};

const centreValues = (row: Row): void => {
  PIVOT_VALUE_KEYS.forEach((k) => {
    row.getCell(k).alignment = { vertical: 'middle', horizontal: 'center' };
  });
};

const addPivotSheet = (wb: Workbook, name: string, rowLabel: string, rows: SlaPivotRow[]) => {
  const ws = wb.addWorksheet(name, FROZEN_HEADER);
  addPivotColumns(ws, rowLabel, 32);
  let dataIdx = 0;
  rows.forEach((r) => {
    const row = ws.addRow({
      label: r.resource,
      fr: r.avgFirstResponseMet,
      res: r.avgResolvedMet,
      cnt: r.ticketCount,
    });
    if (r.resource === GRAND_TOTAL) {
      styleGrandTotalRow(row);
    } else {
      styleBodyRow(row, { fill: bandFill(dataIdx) });
      dataIdx += 1;
    }
    PIVOT_VALUE_KEYS.forEach((k) => {
      const cell = row.getCell(k);
      cell.alignment = { ...(cell.alignment || {}), horizontal: 'center' };
    });
  });
};

const addIssueTypeSheet = (wb: Workbook, groups: IssueTypePivotRow[]): void => {
  const ws = wb.addWorksheet('Pivot by Issue Type', FROZEN_HEADER);
  addPivotColumns(ws, 'Issue Type / Sub-Issue Type', 38);
  groups.forEach((g) => {
    const row = ws.addRow({
      label: g.issueType,
      fr: g.avgFirstResponseMet,
      res: g.avgResolvedMet,
      cnt: g.ticketCount,
    });
    if (g.issueType === GRAND_TOTAL) {
      styleGrandTotalRow(row);
      centreValues(row);
      return;
    }
    styleBodyRow(row, { fill: XLSX_PARENT_FILL, bold: true });
    centreValues(row);
    (g.children || []).forEach((c, childIdx) => {
      const child = ws.addRow({
        label: c.subIssueType,
        fr: c.avgFirstResponseMet,
        res: c.avgResolvedMet,
        cnt: c.ticketCount,
      });
      styleBodyRow(child, { fill: bandFill(childIdx) });
      child.getCell('label').alignment = { vertical: 'middle', indent: 2 };
      centreValues(child);
    });
  });
};

/** Four sheets: the flat ticket list and the three pivots, styled like every other export. */
export async function buildSlaWorkbook({
  tickets,
  pivot,
  pivotByPriority,
  pivotByIssueType,
}: SlaWorkbookInput): Promise<Blob> {
  const ExcelJS = await loadExcel();
  const wb = new ExcelJS.Workbook();
  addReportSheet(wb, tickets);
  addPivotSheet(wb, 'Pivot by Resource', 'Resource', pivot);
  addPivotSheet(wb, 'Pivot by Priority', 'Priority', pivotByPriority);
  addIssueTypeSheet(wb, pivotByIssueType);
  return workbookToBlob(wb);
}
