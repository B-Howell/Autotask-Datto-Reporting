import type { GridColDef } from '@mui/x-data-grid';
import type { DeviceRow } from '@/store/deviceDataStore';
import { parseUsDate } from '@/utils/dates';
import {
  XLSX_ROW_BORDER,
  bandFill,
  loadExcel,
  styleHeaderRow,
  workbookToBlob,
} from '@/utils/excel';

type DeviceColumn = GridColDef<DeviceRow>;
type CellValue = string | number | Date;

// Date columns are identified by header so the export can write real Date
// values (sortable newest→oldest in Excel) instead of strings.
const isDateOnly = (header: string | undefined): boolean => header === 'Purchase Date';
const isDateTime = (header: string | undefined): boolean => header === 'Last Seen';

// "Last Seen" arrives as "MM/DD/YYYY hh:mm:ss AM/PM"; the browser's parser
// handles that format unambiguously.
const parseDateTime = (value: unknown): Date | null => {
  if (typeof value !== 'string' || !value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const cellValue = (col: DeviceColumn, row: DeviceRow): CellValue => {
  const raw = row[col.field as keyof DeviceRow] ?? '';
  if (isDateOnly(col.headerName)) return parseUsDate(raw) ?? raw;
  if (isDateTime(col.headerName)) return parseDateTime(raw) ?? raw;
  return raw;
};

const columnWidth = (col: DeviceColumn): number =>
  Math.min(Math.max((col.headerName || '').length + 4, 14), 40);

/** One "Devices" sheet with the given columns in order, frozen header and banded rows. */
export async function buildDeviceWorkbook(
  columns: DeviceColumn[],
  rows: DeviceRow[]
): Promise<Blob> {
  const ExcelJS = await loadExcel();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Devices', { views: [{ state: 'frozen', ySplit: 1 }] });

  ws.columns = columns.map((col) => ({
    header: col.headerName,
    key: col.field,
    width: columnWidth(col),
  }));
  styleHeaderRow(ws.getRow(1));

  columns.forEach((col, i) => {
    const wsCol = ws.getColumn(i + 1);
    if (isDateOnly(col.headerName)) wsCol.numFmt = 'mm/dd/yyyy';
    else if (isDateTime(col.headerName)) wsCol.numFmt = 'mm/dd/yyyy hh:mm:ss AM/PM';
  });

  rows.forEach((row, idx) => {
    const rowData: Record<string, CellValue> = {};
    columns.forEach((col) => {
      rowData[col.field] = cellValue(col, row);
    });
    ws.addRow(rowData).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bandFill(idx) } };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = { bottom: { style: 'thin', color: { argb: XLSX_ROW_BORDER } } };
    });
  });

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return workbookToBlob(wb);
}
