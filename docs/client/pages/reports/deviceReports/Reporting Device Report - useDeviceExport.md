# useDeviceExport

> Hook returning the device page's export action: one workbook from the columns and rows on screen, downloaded or saved to the app.

## Purpose

The device page offers "Download XLSX" and "Save to app", which differ only in whether the
file is downloaded. Both build the same workbook from what the grid shows and record the same
saved-report metadata. Keeping that in a hook leaves the page to composition and gives the
export one memoised identity per set of inputs.

## Interface

`useDeviceExport({ exportColumns, rows, agencyName, selectedCompany })` returns
`(save: boolean) => Promise<void>`.

| Input | Type | Description |
|---|---|---|
| `exportColumns` | `GridColDef<DeviceRow>[]` | The visible columns in display order, from `useVisibleColumns`. |
| `rows` | `DeviceRow[]` | The rows on screen, after the missing-field filter. |
| `agencyName` | `string` | Names the file and the saved report; `'Device'` when empty. |
| `selectedCompany` | `AgencyValue \| null` | Recorded as `agencyId` only when it is a numeric company id. |

## Uses

- `react` (`useCallback`), `GridColDef` from `@mui/x-data-grid`, `AgencyValue` from the API types
- [excelExport](<Reporting Device Report - excelExport.md>) for `buildDeviceWorkbook`
- [sheetRows](<Reporting Device Report - sheetRows.md>) for the `DeviceRow` type
- [dates](<../../../utils/Reporting Util - dates.md>) for `fileDateStamp`, [saveReport](<../../../utils/Reporting Util - saveReport.md>) for `deliverBlob`

## Used By

- [DeviceReports page](<../Reporting Page - DeviceReports.md>) for both export buttons

## Key Behavior

- The file is `<Agency> Computer Inventory <M-D-YY>.xlsx`; the label falls back to `'Device'`
  when the agency name is unknown.
- Saved-report metadata records `reportType: 'devices'`, `format: 'xlsx'`, the title without
  extension, and `agencyId` only for a numeric selection; a group selection sends `''`, which
  the server treats as unknown.
- The workbook uses the filtered `rows`, so a missing-field filter on screen narrows the file
  too.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/deviceReports/useDeviceExport.ts](../../../../../client/src/pages/reports/deviceReports/useDeviceExport.ts)
