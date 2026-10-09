# Annual Utilization gridModels

> Builds the MUI DataGrid column and row model for whichever annual report tab is open, for the spreadsheet view mode.

## Purpose

The annual report can be viewed as formatted tables or as a sortable, filterable grid. The grid needs flat rows and typed columns; this util produces them from the same `Summary`, detail and raw entries the tables use, so the two view modes never disagree. It is a pure util in the Annual Utilization folder.

The design decision is to flatten the department / worker nesting of the detail view into one row per worker: sorting and filtering across a flat list is the point of the spreadsheet mode.

## Interface

| Export | Description |
|---|---|
| `GridRow` | `Record<string, unknown>`; the row shape is only known at runtime. |
| `TabGrid` | `{ columns: GridColDef<GridRow>[], rows: GridRow[] }`. |
| `gridForTab(tab, sources)` | The grid for the tab: `RAW_TAB` gives the raw entries grid, any other non-empty tab gives the agency detail grid, `''` gives the summary grid (or an empty grid when there is no summary). `sources` is `{ summary, summaryRows, entries, detail }`. |

## Uses

- `GridColDef` type from `@mui/x-data-grid`.
- [fiscalYear](<Reporting Annual Utilization - fiscalYear.md>) for `MONTHS_IN_YEAR`, `RAW_TAB`.
- [rawEntries](<Reporting Annual Utilization - rawEntries.md>) for `RAW_COLUMNS`.
- [summary](<Reporting Annual Utilization - summary.md>) for `hrs`, `money` and the `Summary`, `SummaryRow`, `DepartmentDetail` types.
- `UtilizationEntry` from [API types](<../../../api/Reporting API - types.md>).

## Used By

- [AnnualUtilization page](<../Reporting Page - AnnualUtilization.md>) (`gridForTab`)
- [SpreadsheetView](<Reporting Annual Utilization - SpreadsheetView.md>) (`GridRow`, `TabGrid` types)

## Key Behavior

- Summary grid columns: `Agency`, one column per tier in `summary.perDept` (field and header are the tier name; shows annual hours, or a dash for zero), then `Hours per year`, `Cost per year`, `Hours per month`, `Cost per month`. Rows are `summaryRows` with `id` = index.
- Raw entries grid columns are `RAW_COLUMNS` with `type: 'number'` for right-aligned columns; wide columns get `minWidth` 320 and `flex` 2, others 140 and 0.5. Rows are the entries with `id` = index.
- Detail grid columns: `Department`, `Resource`, `Hours per year`, `Hours per month`. Rows are one per worker with `id` `${deptIndex}-${workerIndex}` and `hoursMonth = hours / MONTHS_IN_YEAR`. Department total rows are not included; the grid's own aggregation can be used instead.
- Numeric columns use `valueFormatter` with the shared `hrs` / `money` formatters, so the grid displays the same strings as the tables but sorts on the raw numbers.
- Tier columns in the summary grid use the tier name as the field, so a tier named like a fixed field (`company`, `hrsYr`) would collide; the current names cannot.

## Cleanup Notes

- The tier column headers in the summary grid are not labelled as annual figures, while the neighbouring total columns are; this matches the table but is easy to misread in a sortable grid.
- No tests cover `gridForTab`.

## Source

[client/src/pages/reports/annualUtilization/gridModels.ts](../../../../../client/src/pages/reports/annualUtilization/gridModels.ts)
