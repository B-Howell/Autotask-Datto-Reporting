# DeviceSpreadsheet

> The device inventory grid: heading, in-progress line, and a paged, cell-editable DataGrid of `DeviceRow`s.

## Purpose

The device report page composes several pieces (toolbar, chooser, missing-fields table); this component is the grid piece. It renders the fetched rows with the columns the user chose, lets them edit cells, and shows the latest log line while a fetch runs. It is in the component layer and is presentational: all state and the edit callback come from the page.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | yes | Agency name for the "Devices for ..." heading. |
| `columns` | `GridColDef<DeviceRow>[]` | yes | Columns to show, already filtered by visibility. |
| `rows` | `DeviceRow[]` | yes | Rows to show. |
| `hasData` | `boolean` | yes | Whether to render the heading and grid. |
| `loading` | `boolean` | yes | Shows the spinner and `lastLogLine`. |
| `lastLogLine` | `string` | yes | Most recent server log line. |
| `isDark` | `boolean` | yes | Picks the border and background colours. |
| `page` | `number` | yes | Current page index. |
| `setPage` | `(page: number) => void` | yes | Called on page change. |
| `processRowUpdate` | `(newRow, oldRow) => DeviceRow` | yes | DataGrid edit commit callback. |

## Uses

- `@mui/material` (`Box`, `CircularProgress`, `Typography`)
- `@mui/x-data-grid` types
- [AppDataGrid](<Reporting Component - AppDataGrid.md>)
- [sheetRows](<../pages/reports/deviceReports/Reporting Device Report - sheetRows.md>) for the `DeviceRow` type

## Used By

- [DeviceReports page](<../pages/reports/Reporting Page - DeviceReports.md>)

## Key Behavior

- Fixed page size of 100 with a controlled `paginationModel`, so the page index lives in the store and survives navigation.
- `editMode="cell"` and `disableRowSelectionOnClick`, so a click edits rather than selects.
- Cells carrying the `edited-cell` class (set by the column definitions in `useReportingData`) are painted blue with white text by a rule flagged important and scoped to the wrapper.
- The grid height is `calc(100vh - 250px)` so it fills the page under the toolbar.
- The heading and grid render only when `hasData`; the loading line can render alongside the previous grid during a re-run.

## Cleanup Notes

- Border, background and edited-cell colours are hard-coded hex values chosen by `isDark` rather than theme palette tokens.

## Source

[client/src/components/DeviceSpreadsheet.tsx](../../../client/src/components/DeviceSpreadsheet.tsx)
