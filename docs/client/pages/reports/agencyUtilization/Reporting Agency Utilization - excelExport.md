# Agency Utilization excelExport

> Builds the single-sheet quarterly utilization workbook that mirrors the on-screen table, and names the file after the reporting period.

## Purpose

The quarterly report is delivered as an Excel file. This util turns a `UtilizationReport` into an ExcelJS workbook with the same department / resource / company matrix as the table, styled with the shared workbook palette so it matches the app's other exports. It is a util in the Agency Utilization folder with no React; the page calls it and hands the resulting `Blob` to `deliverBlob`.

## Interface

| Export | Description |
|---|---|
| `periodLabel(report)` | `report.periodLabel`, falling back to `"<start> to <end>"` when the server sent none. |
| `utilizationExportFilename(report)` | `Agency Utilization <periodLabel>.xlsx`, for example `Agency Utilization Q3 2025.xlsx`. |
| `buildQuarterlyWorkbook(report)` | `Promise<Blob>`: loads ExcelJS lazily, builds the sheet, returns an xlsx blob. |

## Uses

- `exceljs` (types only at import time; the module is loaded on demand through `loadExcel`).
- [excel util](<../../../utils/Reporting Util - excel.md>) for `XLSX_HEADER_FILL`, `XLSX_PARENT_FILL`, `bandFill`, `loadExcel`, `styleBodyRow`, `styleHeaderRow`, `workbookToBlob`.
- [grouping](<Reporting Agency Utilization - grouping.md>) for `groupRowsByCategory`.
- `UtilizationReport`, `UtilizationRow` types from [API types](<../../../api/Reporting API - types.md>).

## Used By

- [AgencyUtilization page](<../Reporting Page - AgencyUtilization.md>)

## Key Behavior

Sheet layout (one worksheet named with `periodLabel`, first row frozen, autofilter over the header row):

| Row | Column A | Column B | Columns C.. | Last column |
|---|---|---|---|---|
| 1 (header) | `Department` | `Resource` | one per `report.companies` | `Grand Total` |
| department row | category name (bold, `XLSX_PARENT_FILL`) | blank | `categoryTotals[category]` per company | rounded sum |
| worker rows | blank | worker name | `byCompany` per company | rounded sum |
| last row | `Grand Total` (bold, header fill, white text) | blank | `companyTotals` per company | `grandTotal` |

- Zero hours are written as empty strings, not `0`, in every body row including the grand total. Row sums are rounded to two decimals with `round2`; per-company values are written as the server sent them.
- Numeric cells from column 3 onward get number format `0.##` and right alignment; the first two columns are text.
- Worker rows alternate fills with `bandFill(index)` within each department; the department header row uses the parent fill.
- Column widths: 28 for Department and Resource, otherwise `max(header length + 4, 14)`.
- The worksheet name is the period label. A fallback label such as `2025-07-01 to 2025-09-30` is 24 characters, inside Excel's 31-character limit, and the server's labels contain no characters Excel rejects.
- The output is an in-memory `Blob`; download versus save-to-app is the page's decision.

## Cleanup Notes

- `writeGrandTotal` restyles every cell's font after `styleBodyRow`; the shared `styleGrandTotalRow` in the excel util does the same thing and is not used here.
- No tests exercise the sheet layout.

## Source

[client/src/pages/reports/agencyUtilization/excelExport.ts](../../../../../client/src/pages/reports/agencyUtilization/excelExport.ts)
