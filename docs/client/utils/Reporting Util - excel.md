# excel util

> The shared exceljs loader, workbook palette and row stylers that make every xlsx export look like part of one set.

## Purpose

`client/src/utils/excel.ts` is the common layer under the five Excel export builders (devices, SLA, quarterly and annual utilization, HDD tickets) and the in-app workbook viewer. It owns two things: the on-demand import of exceljs, which is over 500 kB minified and must not be in the initial bundle, and the palette plus styling helpers so a header row, a banded body row and a grand-total row are identical across reports.

## Interface

| Export | Signature | Description |
|---|---|---|
| `XLSX_HEADER_FILL`, `XLSX_HEADER_BORDER` | ARGB strings | Blue header fill `FF1D4ED8` and its darker border. |
| `XLSX_ROW_EVEN`, `XLSX_ROW_ODD`, `XLSX_ROW_BORDER` | ARGB strings | Body banding fills and the thin bottom border. |
| `XLSX_PARENT_FILL` | ARGB string | Light indigo for grouping or parent rows. |
| `XLSX_MIME` | string | The xlsx media type for the Blob. |
| `loadExcel` | `() => Promise<typeof ExcelJS>` | Dynamic import; unwraps `default` when present. |
| `styleHeaderRow` | `(row: Row) => void` | Height 22, bold white 11 pt, blue fill, left/middle wrapped, full border. |
| `styleBodyRow` | `(row, { fill?, bold? }) => void` | Solid fill (default odd white), middle alignment, thin bottom border; optional bold. |
| `styleGrandTotalRow` | `(row) => void` | Header colours on a body row, bottom border only. |
| `bandFill` | `(index: number) => string` | Even index to `XLSX_ROW_EVEN`, odd to `XLSX_ROW_ODD`. |
| `workbookToBlob` | `(wb: Workbook) => Promise<Blob>` | `writeBuffer()` wrapped in a Blob with `XLSX_MIME`. |

## Uses

- `exceljs`, imported as types at module level and as code only inside `loadExcel`.

## Used By

- Export builders: [deviceReports excelExport](<../pages/reports/deviceReports/Reporting Device Report - excelExport.md>), [slaPerformance excelExport](<../pages/reports/slaPerformance/Reporting SLA - excelExport.md>), [agencyUtilization excelExport](<../pages/reports/agencyUtilization/Reporting Agency Utilization - excelExport.md>), [annualUtilization excelExport](<../pages/reports/annualUtilization/Reporting Annual Utilization - excelExport.md>), [hddTickets excelExport](<../pages/reports/hddTickets/Reporting HDD Tickets - excelExport.md>).
- [SavedReportViewer](<../components/Reporting Component - SavedReportViewer.md>) uses `loadExcel` to parse a saved workbook for display.

## Key Behavior

- `import type * as ExcelJS` keeps the type information without pulling the library into the app chunk; only the `await import('exceljs')` inside `loadExcel` creates the separate chunk.
- `loadExcel` returns `mod.default ?? mod` because exceljs is a CommonJS package whose interop shape differs between the Vite dev server and the production build.
- `styleBodyRow` and `styleGrandTotalRow` merge the existing `alignment` (and `font` when bolding) so a column-level `horizontal: 'right'` set by the builder survives the styling pass.
- `styleHeaderRow` sets `wrapText`, so long header labels wrap within the 22-point row rather than widening the column.
- Colour constants are ARGB with an opaque `FF` alpha, the form exceljs expects; the matching PDF accent in the pdf util is the same blue as RGB.
- `bandFill` takes whatever index the builder passes; builders pass the data row index rather than the sheet row number, so a title block above the table does not shift the pattern.

## Cleanup Notes

- None noted.

## Source

[client/src/utils/excel.ts](../../../client/src/utils/excel.ts)
