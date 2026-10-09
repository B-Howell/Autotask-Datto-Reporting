# deviceDataStore

> Fetched device-report state: grid columns, all rows, the filtered rows, edit tracking and the selected agency, kept outside the page so it survives navigation.

## Purpose

The device inventory report is the largest and most interactive report: a grid of every device for an agency, with four editable columns that write back to Autotask. This store holds the fetched sheet and the editing state so the user can leave the page and return without regenerating. It sits in the store layer; the logic that fills it lives in `useReportingData`.

Column-visibility preferences are deliberately kept in a separate store (`deviceReportStore`) because they are a persisted user preference, not fetched data.

## Interface

Not created by the `reportDataStore` factory; it has a bespoke shape and no `error` field.

| Field / action | Type | Description |
|---|---|---|
| `columns` | `GridColDef<DeviceRow>[]` | Grid column definitions built from the sheet header. |
| `rows` | `DeviceRow[]` | Rows currently shown (after the missing-field filter). |
| `allRows` | `DeviceRow[]` | Every fetched row, the source for filtering. |
| `loading`, `logs` | `boolean`, `string[]` | Job state fed by `useTrackedReport`. |
| `selectedCompany` | `AgencyValue \| null` | Dropdown value of the agency the rows belong to. |
| `page` | `number` | Grid page index, so returning to the page keeps position. |
| `editedCells` | `EditedCells` | Map of `${rowId}-${field}` to true for cells changed since the last post. |
| `missingFilter` | `string` | Current missing-field filter: a header name, `all`, or empty. |
| `editableCols` | `EditableCols` | Editable header name to grid field, for example `Department` to `col3`. |
| `setRows`, `setAllRows`, `setLogs`, `setEditedCells` | updater setters | Accept a value or `prev => next`. |
| other setters | plain | `setColumns`, `setLoading`, `setSelectedCompany`, `setPage`, `setMissingFilter`, `setEditableCols`. |

Exported types: `DeviceRow` (`id`, `rowNumber`, `company`, `autotaskId`, and `col0..colN` cells), `EditedCells`, `EditableCols`.

## Uses

- `zustand` (`create`)
- `@mui/x-data-grid` for `GridColDef`
- [reportDataStore](<Reporting Store - reportDataStore.md>) for `applyUpdater`, `Updater`
- [API types](<../api/Reporting API - types.md>) for `AgencyValue`, `SheetCell`

## Used By

- [useReportingData](<../hooks/Reporting Hook - useReportingData.md>), the only writer
- [DeviceSpreadsheet](<../components/Reporting Component - DeviceSpreadsheet.md>) and [PostData](<../components/Reporting Component - PostData.md>) for the `DeviceRow` type
- [deviceReports excelExport](<../pages/reports/deviceReports/Reporting Device Report - excelExport.md>)
- [useVisibleColumns](<../pages/reports/deviceReports/Reporting Device Report - useVisibleColumns.md>)

## Key Behavior

- `DeviceRow.autotaskId` is the Autotask configuration item id; it is the key the write-back path uses, and null when the server could not supply one.
- The `col${number}` template index signature means every sheet column is addressed positionally; header names are only mapped to fields through `editableCols`.
- `rows` and `allRows` are both updated on an edit so that clearing a filter does not resurrect the pre-edit value.
- The store never clears itself; a new fetch overwrites each field in turn in `useReportingData`.

## Cleanup Notes

- `loading` and `logs` duplicate half of `ReportDataState` without `error`, so a failed device fetch has nowhere to surface except the status bar and the console.

## Source

[client/src/store/deviceDataStore.ts](../../../client/src/store/deviceDataStore.ts)
