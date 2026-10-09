# Device report sheetRows

> Turns the server's device sheets into grid rows and picks export columns by header name, with no React, store or DOM dependency.

## Purpose

The device report arrives as one positional sheet per agency (a header row and body rows, with a parallel list of Autotask ids). Both the page and a headless renderer need the same two transformations: stack the member sheets of a group into one row set tagged by company, and choose which columns an export prints. This module holds those transformations so there is one implementation, and it defines the `DeviceRow` and `EditableCols` shapes alongside the function that produces them. It is a pure util in the Device Reports folder.

## Interface

| Export | Description |
|---|---|
| `DeviceRow` | One grid row: `id`, `rowNumber`, `company`, `autotaskId` (configuration item id or null) and `col0..colN` cells. |
| `EditableCols` | Editable header name to grid field, for example `Department` to `col3`. |
| `EDITABLE_HEADERS` | `Primary User or Role`, `Purchase Date`, `Department`, `Location`: the columns the grid lets the user edit and write back. |
| `MemberSheet` | `{ sheet, ids, companyName }`, one member's response plus the name to tag its rows with. |
| `mergeSheets(sheets)` | `{ header, rows, editableCols }`: the first member's header, every body row as a `DeviceRow`, and the editable header to field map. |
| `ExportColumn` | `{ field: 'col<n>', headerName }`, the two fields the workbook builder reads. |
| `selectColumns(header, wanted)` | The `ExportColumn` for each name in `wanted`, in that order; names the header does not have are dropped. |

## Uses

- `SheetCell` type from [API types](<../../../api/Reporting API - types.md>).

## Used By

- [useReportingData](<../../../hooks/Reporting Hook - useReportingData.md>) (`mergeSheets`, `MemberSheet`).
- [deviceDataStore](<../../../store/Reporting Store - deviceDataStore.md>) (`DeviceRow`, `EditableCols` for its state), and [DeviceSpreadsheet](<../../../components/Reporting Component - DeviceSpreadsheet.md>), [PostData](<../../../components/Reporting Component - PostData.md>), [useVisibleColumns](<Reporting Device Report - useVisibleColumns.md>) and [excelExport](<Reporting Device Report - excelExport.md>) (`DeviceRow`).
- [client/src/pages/reports/deviceReports/sheetRows.test.ts](../../../../../client/src/pages/reports/deviceReports/sheetRows.test.ts).

## Key Behavior

- `mergeSheets` takes the header from the first member that has one and ignores later members' headers, so a group is assumed to share a schema. A member whose sheet is empty is skipped.
- Rows are numbered across the whole group: `id` is the running index from 0 and `rowNumber` is `id + 1`, so a second member's rows continue after the first's. `autotaskId` is `ids[i]` for the member's i-th body row, or null when the list is short.
- Cells are stored positionally as `col<j>`; a header name only becomes meaningful through `editableCols`, which maps each `EDITABLE_HEADERS` entry found in the header to its field.
- `selectColumns` matches header text exactly and keeps the caller's order rather than the sheet's, so an export can print columns in a chosen sequence. Non-string header cells (numbers, nulls) are never selectable.
- `ExportColumn` satisfies the `Pick<GridColDef, 'field' | 'headerName'>` that `buildDeviceWorkbook` accepts, so a renderer can build the workbook without any grid column objects.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/deviceReports/sheetRows.ts](../../../../../client/src/pages/reports/deviceReports/sheetRows.ts)
