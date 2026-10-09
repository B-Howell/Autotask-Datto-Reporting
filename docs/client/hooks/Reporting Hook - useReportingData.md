# useReportingData

> The device inventory report's hook: fetches each member's sheet, builds the grid columns, tracks cell edits, filters for missing fields, and writes edits back to Autotask.

## Purpose

The device report is a spreadsheet from the server (a header row plus body rows, with a parallel list of Autotask configuration item ids) that the user can edit in four columns and post back. This hook turns that sheet into DataGrid columns and rows, keeps the editing state in `deviceDataStore`, and owns the write-back call. It is in the hook layer and is the only writer of `deviceDataStore`.

The decision behind it is that the grid is positional: columns are `col0..colN` from the header, and only the four editable headers are mapped by name.

## Interface

Returns the store fields `columns`, `rows`, `allRows`, `loading`, `logs`, `selectedCompany`, `page`, `editedCells`, `missingFilter`, `editableCols`, plus:

| Function | Description |
|---|---|
| `fetchDevices(agency)` | Runs the tracked job for an agency or group. |
| `setPage(page)` | Grid page setter from the store. |
| `processRowUpdate(newRow, oldRow)` | DataGrid callback; records which editable cells changed. |
| `handleFilterChange(field)` | Applies the missing-field filter. |
| `postChanges()` | Writes every edited cell to Autotask and toasts the outcome. |

Module constants: `END_USER_TYPES` (`Desktop`, `Laptop`, `Tablet`) and the type field `col0`. The editable header list lives with `mergeSheets` in sheetRows.

## Uses

- `@mui/x-data-grid` types
- [devices API](<../api/Reporting API - devices.md>) for `fetchDeviceSheet`, `deviceLogsUrl`, `updateDevices`
- [API types](<../api/Reporting API - types.md>) for `DeviceChange`, `EffectiveAgency`, `SheetCell`
- [sheetRows](<../pages/reports/deviceReports/Reporting Device Report - sheetRows.md>) for `mergeSheets` and the `MemberSheet`, `DeviceRow` and `EditableCols` types
- [deviceDataStore](<../store/Reporting Store - deviceDataStore.md>) and its `EditedCells` type
- [toastStore](<../store/Reporting Store - toastStore.md>)
- [agencyGroups util](<../utils/Reporting Util - agencyGroups.md>) for `membersOf`, `valueFor`
- [reportJob util](<../utils/Reporting Util - reportJob.md>) for `errorMessage`
- [useTrackedReport](<Reporting Hook - useTrackedReport.md>)

## Used By

- [DeviceReports page](<../pages/reports/Reporting Page - DeviceReports.md>)

## Key Behavior

- `fetchDevices` fetches each member of a group in sequence with the job's abort signal, then `mergeSheets` (from sheetRows) stacks the bodies under the first member's header, tags each row with `company`, assigns sequential `id` and `rowNumber`, and sets `autotaskId` from the member's `ids[i]` (null if missing). The log stream is opened on the first member's `deviceLogsUrl` only. The label is `Device Report · <agency name>` and the route `/reports/device`.
- `buildColumns` prepends a `#` column that renders the row's position among visible rows (so numbering stays 1..N after sort or filter), marks a column `editable` only if `mergeSheets` mapped its header in `editableCols`, and gives edited cells the `edited-cell` class by reading `editedCells` from the store at render time.
- On success the hook resets `editedCells`, sets `page` to 0 and stores both `rows` and `allRows`. On failure it clears `columns` and `rows` only.
- `processRowUpdate` compares only the editable fields; when one changed it marks `${rowId}-${field}` in `editedCells` and replaces the row in both `rows` and `allRows`.
- Missing-field filter: empty restores `allRows`; `all` means any editable column; otherwise one header name. A row is kept when its `col0` value is in `END_USER_TYPES` and at least one of the chosen columns is empty. An unknown header name leaves the rows unchanged.
- Write-back path: for each key in `editedCells`, the row is found in `allRows` and the header name recovered from `editableCols`. `deviceId` is the row's `autotaskId`; rows with a null `autotaskId` are counted as unwritable and skipped. Each change is `{ deviceId, field: <header name>, value: String(cell) }`. With no writable changes the toast says to regenerate the report to pick up device ids. After `updateDevices`, results with `status === 'error'` plus the unwritable count produce a warning toast and the edits are kept for retry; a clean run toasts success and clears `editedCells`. A thrown error toasts `Update failed: <message>`.

## Cleanup Notes

- The device type is read positionally from `col0`, while `PostData` finds it by the `Product` header and only treats Laptop and Desktop as end-user devices; the two filters can disagree on tablets or if the sheet's column order changes.
- `buildColumns` and the write-back assembly have no unit tests; `mergeSheets` is covered by the sheetRows test.
- No `setError` is passed to `useTrackedReport`, so a failed fetch only reaches the status bar and the console.

## Source

[client/src/hooks/useReportingData.ts](../../../client/src/hooks/useReportingData.ts)
