import type * as ExcelJS from 'exceljs';
import type { Row, Workbook } from 'exceljs';

// One palette for every workbook the app writes, so a set of reports looks like a set.
export const XLSX_HEADER_FILL = 'FF1D4ED8';
export const XLSX_HEADER_BORDER = 'FF1E3A8A';
export const XLSX_ROW_EVEN = 'FFF8FAFC';
export const XLSX_ROW_ODD = 'FFFFFFFF';
export const XLSX_ROW_BORDER = 'FFE5E7EB';
export const XLSX_PARENT_FILL = 'FFE0E7FF';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function loadExcel(): Promise<typeof ExcelJS> {
  const mod = await import('exceljs');
  return mod.default ?? mod;
}

export function styleHeaderRow(row: Row): void {
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_HEADER_FILL } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: XLSX_HEADER_BORDER } },
      bottom: { style: 'thin', color: { argb: XLSX_HEADER_BORDER } },
      left: { style: 'thin', color: { argb: XLSX_HEADER_BORDER } },
      right: { style: 'thin', color: { argb: XLSX_HEADER_BORDER } },
    };
  });
}

export function styleBodyRow(row: Row, { fill = XLSX_ROW_ODD, bold = false } = {}): void {
  row.eachCell((cell) => {
    if (bold) cell.font = { ...(cell.font ?? {}), bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    cell.alignment = { vertical: 'middle', ...(cell.alignment ?? {}) };
    cell.border = { bottom: { style: 'thin', color: { argb: XLSX_ROW_BORDER } } };
  });
}

export function styleGrandTotalRow(row: Row): void {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_HEADER_FILL } };
    cell.alignment = { vertical: 'middle', ...(cell.alignment ?? {}) };
    cell.border = { bottom: { style: 'thin', color: { argb: XLSX_HEADER_BORDER } } };
  });
}

export const bandFill = (index: number): string => (index % 2 === 0 ? XLSX_ROW_EVEN : XLSX_ROW_ODD);

export async function workbookToBlob(wb: Workbook): Promise<Blob> {
  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: XLSX_MIME });
}
