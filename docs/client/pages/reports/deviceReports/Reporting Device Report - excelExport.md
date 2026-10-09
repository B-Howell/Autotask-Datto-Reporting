# Device report excelExport

> Builds the device inventory workbook: one "Devices" sheet in the grid's visible column order, with real date cells.

## Purpose

This module turns the device grid's columns and rows into an `.xlsx` blob. It exists apart
from the page so the workbook layout is testable and so the export follows the user's column
choice exactly: the page passes the visible columns (minus the row number) and the filtered
rows. The one design decision is to write date columns as Excel `Date` values rather than the
server's strings, so they sort newest to oldest inside Excel.

## Interface

```ts
export async function buildDeviceWorkbook(
  columns: Pick<GridColDef<DeviceRow>, 'field' | 'headerName'>[],
  rows: DeviceRow[]
): Promise<Blob>
```

Only `field` and `headerName` are read, so the page's grid columns and the `ExportColumn[]`
from [sheetRows](<Reporting Device Report - sheetRows.md>) both satisfy the parameter.

Returns a Blob with the xlsx MIME type. Private helpers: `isDateOnly` (header equals
`Purchase Date`), `isDateTime` (header equals `Last Seen`), `parseDateTime`, `cellValue`,
`columnWidth`.

## Uses

- `exceljs`, loaded lazily through `loadExcel`, and the `GridColDef` type from `@mui/x-data-grid`.
- [excel util](<../../../utils/Reporting Util - excel.md>) for `loadExcel`, `styleHeaderRow`,
  `bandFill`, `XLSX_ROW_BORDER` and `workbookToBlob`.
- [dates util](<../../../utils/Reporting Util - dates.md>) for `parseUsDate`.
- [deviceDataStore](<../../../store/Reporting Store - deviceDataStore.md>) for the `DeviceRow` type, which it re-exports from [sheetRows](<Reporting Device Report - sheetRows.md>).

## Used By

- [DeviceReports page](<../Reporting Page - DeviceReports.md>) from `handleExport`, which names
  the file `<Agency> Computer Inventory <M-D-YY>.xlsx`.

## Key Behavior

Sheet layout:

- Worksheet `Devices`, with the first row frozen (`ySplit: 1`).
- Columns are exactly the `columns` argument in order: header `headerName`, key `field`.
  Width is `clamp(headerLength + 4, 14, 40)` characters.
- Row 1 is styled by `styleHeaderRow` (bold white 11pt on the shared blue header fill, thin
  dark-blue border, left aligned, wrapped, height 22).
- An auto-filter spans row 1 from column 1 to the last column.
- Body cells: banded fill via `bandFill(rowIndex)` (even rows pale grey, odd rows white),
  vertical middle alignment with wrapping, and a thin bottom border in `XLSX_ROW_BORDER`.
- There are no totals or footer rows.

Values:

- A cell is `row[col.field]`, defaulting to `''` when the field is missing.
- `Purchase Date` columns: `parseUsDate` turns `MM/DD/YYYY` into a `Date`; the column number
  format is `mm/dd/yyyy`. Unparseable values are written as the raw string.
- `Last Seen` columns: `new Date(value)` parses the server's `MM/DD/YYYY hh:mm:ss AM/PM`
  string; format `mm/dd/yyyy hh:mm:ss AM/PM`. Invalid dates fall back to the raw string.
- Date columns are recognised by header text, so renaming either header in the server sheet
  silently turns that column back into strings.

## Cleanup Notes

- Date detection by header name is fragile; a column-type flag from the server would be
  more robust.
- No unit test exercises the date conversions.

## Source

[client/src/pages/reports/deviceReports/excelExport.ts](../../../../../client/src/pages/reports/deviceReports/excelExport.ts)
