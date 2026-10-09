import type { SheetCell } from '@/api';

/** One grid row: `col0`..`colN` hold the sheet cells, plus the synthetic columns. */
export interface DeviceRow {
  id: number;
  rowNumber: number;
  company: string;
  /** Autotask configuration item id, needed to write edits back. */
  autotaskId: number | null;
  [column: `col${number}`]: SheetCell | undefined;
}

/** Editable header name -> grid field (`col3`). */
export type EditableCols = Record<string, `col${number}`>;

/** Columns the grid lets the user edit and write back to Autotask. */
export const EDITABLE_HEADERS = ['Primary User or Role', 'Purchase Date', 'Department', 'Location'];

export interface MemberSheet {
  sheet: SheetCell[][];
  ids: (number | null)[];
  companyName: string;
}

/** Stack member sheets under one header, tagging each row with its company. */
export function mergeSheets(sheets: MemberSheet[]) {
  let header: SheetCell[] = [];
  const editableCols: EditableCols = {};
  const rows: DeviceRow[] = [];
  for (const { sheet, ids, companyName } of sheets) {
    const [headerRow, ...bodyRows] = sheet;
    if (!headerRow) continue;
    if (!header.length) {
      header = headerRow;
      headerRow.forEach((name, index) => {
        if (typeof name === 'string' && EDITABLE_HEADERS.includes(name)) {
          editableCols[name] = `col${index}`;
        }
      });
    }
    bodyRows.forEach((cells, i) => {
      const row: DeviceRow = {
        id: rows.length,
        rowNumber: rows.length + 1,
        company: companyName,
        autotaskId: ids[i] ?? null,
      };
      cells.forEach((cell, j) => {
        row[`col${j}`] = cell;
      });
      rows.push(row);
    });
  }
  return { header, rows, editableCols };
}

export interface ExportColumn {
  field: `col${number}`;
  headerName: string;
}

/** Columns for an export, by header text, in the order given; unknown names are dropped. */
export function selectColumns(header: SheetCell[], wanted: string[]): ExportColumn[] {
  const byName = new Map<string, ExportColumn>();
  header.forEach((name, index) => {
    if (typeof name === 'string') byName.set(name, { field: `col${index}`, headerName: name });
  });
  return wanted.map((name) => byName.get(name)).filter((c): c is ExportColumn => c !== undefined);
}
