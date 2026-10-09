# SavedReportViewer

> Dialog that shows a saved report inside the app: workbooks as a paged grid, PDFs in the browser's viewer, anything else as a download.

## Purpose

Reports saved to the app are files (xlsx, pdf, docx) stored on the server. Opening them should not always mean downloading. This component fetches a workbook's bytes, parses it with exceljs and renders each sheet as a table; embeds a PDF; and for other formats explains that it must be downloaded. It is in the component layer and is opened by the saved reports page.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `report` | `SavedReport \| null` | yes | The report to show; null closes the dialog. |
| `onClose` | `() => void` | yes | Close handler. |

## Uses

- `react`, `@mui/material` dialog, tabs, table and pagination components
- `exceljs` (`CellValue` type, workbook loaded lazily)
- [savedReports API](<../api/Reporting API - savedReports.md>) for `fetchSavedReportBytes`, `savedReportDownloadUrl`
- [API types](<../api/Reporting API - types.md>) for `SavedReport`
- [reportJob util](<../utils/Reporting Util - reportJob.md>) for `errorMessage`
- [excel util](<../utils/Reporting Util - excel.md>) for `loadExcel`

## Used By

- [SavedReports page](<../pages/reports/Reporting Page - SavedReports.md>)

## Key Behavior

- Format is `report.format` lower-cased. The effect resets sheets, error, sheet index and page whenever `report` or format changes, and only fetches for `xlsx`; a `cancelled` flag drops a late result after the report changes.
- exceljs is loaded on demand through `loadExcel`, so the viewer does not add it to the initial bundle.
- Each worksheet becomes `{ name, header, rows, width }`: `row.values` is 1-based with a leading hole, so index 0 is dropped; the first non-empty row is the header; `width` is the longest row so every rendered row has the same number of cells.
- `cellText` makes every exceljs value printable: Dates become `YYYY-MM-DD`, rich text is joined, formula cells use `result`, hyperlink cells use `text` then `hyperlink`, numbers are rounded to two decimals, null and undefined become empty strings.
- Sheet tabs appear only when a workbook has more than one sheet; switching sheets resets the page. Pagination is 100 rows per page.
- PDFs render in an `<object>` pointed at the download URL at 70vh. Other formats show an info alert with a Download button and the format name upper-cased.
- The dialog footer always offers Download and Close; the title shows `title` or `filename`, with agency name and format beneath.

## Cleanup Notes

- None noted.

## Source

[client/src/components/SavedReportViewer.tsx](../../../client/src/components/SavedReportViewer.tsx)
