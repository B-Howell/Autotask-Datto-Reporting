# SLA Excel export

> Builds the four-sheet SLA workbook (the ticket list and the three pivots) with ExcelJS, styled like every other export in the app.

## Purpose

The SLA report leaves the app as an Excel file so account managers can filter and re-pivot it. This module writes exactly what is on screen: the filtered ticket list and the three pivots as computed by `pivots.ts`, using the shared workbook palette so a set of monthly reports looks like a set. Pure builder, page layer; the page downloads and uploads the Blob through `deliverBlob`.

## Interface

- `buildSlaWorkbook({ tickets, pivot, pivotByPriority, pivotByIssueType }): Promise<Blob>`.
- `slaExportFilename(month, year)`: `SLA Performance By Ticket <MonthName><year>.xlsx` (no space between month and year, for example `SLA Performance By Ticket September2026.xlsx`).
- `SlaWorkbookInput` is the exported input type.

## Uses

- `exceljs`, loaded lazily through `loadExcel`, plus `styleHeaderRow`, `styleBodyRow`, `styleGrandTotalRow`, `bandFill`, `XLSX_PARENT_FILL`, `workbookToBlob` from [excel util](<../../../utils/Reporting Util - excel.md>).
- `MONTH_NAMES` and `parseUsDate` from [dates util](<../../../utils/Reporting Util - dates.md>).
- `COLUMNS`, `DATE_KEYS`, `SlaColumn` from [columns](<Reporting SLA - columns.md>); `GRAND_TOTAL`, `IssueTypePivotRow` from [pivots](<Reporting SLA - pivots.md>).
- `SlaTicket`, `SlaPivotRow` types from [API types](<../../../api/Reporting API - types.md>).

## Used By

- [SlaPerformance page](<../Reporting Page - SlaPerformance.md>): Export Excel downloads and saves; Save to app saves only. Saved-report metadata is `agencyName: 'All Agencies'`, `reportType: 'sla'`, `format: 'xlsx'`.

## Key Behavior

- Every sheet freezes its header row (`ySplit: 1`), styles it with `styleHeaderRow` (white bold on the shared blue) and sets an auto-filter across the header.
- Sheet 1, "Report": one column per `COLUMNS` entry in order, header from the label, width clamped to between 14 and 40 characters from the label length plus 4. Date columns receive real `Date` cells via `parseUsDate` (falling back to the raw string) with number format `mm/dd/yyyy`; numeric columns get `0.##`; met columns are written as the text "Yes" or "No" (blank when null) and then coloured bold green (`FF15803D`) or bold red (`FFB91C1C`) and centred. Rows are banded by index with `bandFill`.
- Sheets 2 and 3, "Pivot by Resource" and "Pivot by Priority": columns `<label>` (width 32), "Avg First Response Met" (26), "Avg Resolved Met" (22), "Tickets" (14), with formats `0.0%`, `0.0%`, `0`. The percentage columns receive the raw fractions from the pivot rows so Excel formats them. Rows are banded by a counter that skips the Grand Total row, which is styled with `styleGrandTotalRow` instead; all three value cells are centred.
- Sheet 4, "Pivot by Issue Type": same columns with a 38-wide label. Each issue type is a bold row filled with `XLSX_PARENT_FILL`, followed by its sub-issue rows banded by child index with the label indented two levels. The Grand Total row closes the sheet.
- Rows are written in the order the pivot builders produce them (alphabetical, or P1..P4 for priority), so the workbook matches the tabs.

## Cleanup Notes

- The `0.##` format shows a trailing decimal point for whole numbers in Excel (for example `5.`); `0.##` would need to become a conditional or `General` format to avoid that.
- `addPivotSheet` inlines the same centring loop that `centreValues` provides and is used by `addIssueTypeSheet`; the two could share it.

## Source

[client/src/pages/reports/slaPerformance/excelExport.ts](../../../../../client/src/pages/reports/slaPerformance/excelExport.ts)
