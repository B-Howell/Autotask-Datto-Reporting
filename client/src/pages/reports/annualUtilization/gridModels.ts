import type { GridColDef } from '@mui/x-data-grid';
import type { UtilizationEntry } from '@/api';
import { MONTHS_IN_YEAR, RAW_TAB } from './fiscalYear';
import { RAW_COLUMNS } from './rawEntries';
import { hrs, money } from './summary';
import type { DepartmentDetail, Summary, SummaryRow } from './summary';

// The grids are built from whichever tab is open, so their row shape is only
// known at runtime; the summary grid adds one column per department present.
export type GridRow = Record<string, unknown>;

export interface TabGrid {
  columns: GridColDef<GridRow>[];
  rows: GridRow[];
}

const numberColumn = (
  field: string,
  headerName: string,
  minWidth: number,
  format: (v: number) => string
): GridColDef<GridRow> => ({
  field,
  headerName,
  minWidth,
  flex: 0.5,
  type: 'number',
  valueFormatter: format,
});

const summaryGrid = (summary: Summary, summaryRows: SummaryRow[]): TabGrid => ({
  columns: [
    { field: 'company', headerName: 'Agency', flex: 1, minWidth: 200 },
    ...summary.perDept.map((d) =>
      numberColumn(d.department, d.department, 130, (v) => (v ? hrs(v) : '—'))
    ),
    numberColumn('hrsYr', 'Hours per year', 150, hrs),
    numberColumn('costYr', 'Cost per year', 150, money),
    numberColumn('hrsMo', 'Hours per month', 160, hrs),
    numberColumn('costMo', 'Cost per month', 150, money),
  ],
  rows: summaryRows.map((row, i): GridRow => ({
    id: i,
    company: row.company,
    hrsYr: row.annualHours,
    costYr: row.annualCost,
    hrsMo: row.hours,
    costMo: row.cost,
    ...Object.fromEntries(
      summary.perDept.map((d) => [d.department, d.byCompany[row.company].annualHours])
    ),
  })),
});

const rawEntriesGrid = (entries: UtilizationEntry[]): TabGrid => ({
  columns: RAW_COLUMNS.map((c): GridColDef<GridRow> => ({
    field: c.key,
    headerName: c.label,
    minWidth: c.wide ? 320 : 140,
    flex: c.wide ? 2 : 0.5,
    type: c.align === 'right' ? 'number' : 'string',
  })),
  rows: entries.map((e, i) => ({ id: i, ...e })),
});

// Flat rows rather than the table's department/worker nesting: a grid the
// user can sort and filter is the point of this view.
const detailGrid = (detail: DepartmentDetail[]): TabGrid => ({
  columns: [
    { field: 'department', headerName: 'Department', minWidth: 180, flex: 1 },
    { field: 'resource', headerName: 'Resource', minWidth: 220, flex: 1 },
    numberColumn('hoursYear', 'Hours per year', 150, hrs),
    numberColumn('hoursMonth', 'Hours per month', 160, hrs),
  ],
  rows: detail.flatMap((d, di) =>
    d.workers.map((w, wi) => ({
      id: `${di}-${wi}`,
      department: d.department,
      resource: w.worker,
      hoursYear: w.hours,
      hoursMonth: w.hours / MONTHS_IN_YEAR,
    }))
  ),
});

interface GridSources {
  summary: Summary | null;
  summaryRows: SummaryRow[];
  entries: UtilizationEntry[];
  detail: DepartmentDetail[];
}

/** The spreadsheet view renders whichever tab is selected. */
export const gridForTab = (tab: string, sources: GridSources): TabGrid => {
  if (tab === RAW_TAB) return rawEntriesGrid(sources.entries);
  if (tab) return detailGrid(sources.detail);
  if (!sources.summary) return { columns: [], rows: [] };
  return summaryGrid(sources.summary, sources.summaryRows);
};
