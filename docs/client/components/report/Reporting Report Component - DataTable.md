# DataTable

> Plain MUI table with bold headers, driven by a column spec, for every simple report list.

## Purpose

Several reports show a flat list (patch workstations, HDD devices, raw utilization entries) that does not need DataGrid's sorting and editing. This generic table takes a column spec with a render function per column and a row key, and handles the header styling, hover rows and an optional footer. It is in the report component layer.

## Interface

Generic over `Row`.

| Prop | Type | Required | Description |
|---|---|---|---|
| `columns` | `DataColumn<Row>[]` | yes | `{ key, label, align?, width?, render(row, index) }` per column. |
| `rows` | `Row[]` | yes | Data rows. |
| `rowKey` | `(row, index) => string \| number` | yes | React key per row. |
| `footer` | `ReactNode` | no | Rendered inside the body after the rows, typically a totals row. |
| `stickyHeader` | `boolean` | no | MUI sticky header. Default false. |
| `maxHeight` | `number \| string` | no | Container max height, pairs with `stickyHeader`. |
| `sx` | `SxProps<Theme>` | no | Extra container styles. |
| `onRowClick` | `(row) => void` | no | Makes every row clickable with a pointer cursor. |
| `selectedKey` | `string \| number \| null` | no | The row whose `rowKey` equals this renders with MUI's `selected` style. |

Exports the `DataColumn` type.

## Uses

- `@mui/material` table components

## Used By

- Re-exported by [the report component barrel](<Reporting Report Component - index.md>)
- [annualUtilization RawEntriesTable](<../../pages/reports/annualUtilization/Reporting Annual Utilization - RawEntriesTable.md>)
- [hddTickets HddDeviceTable](<../../pages/reports/hddTickets/Reporting HDD Tickets - HddDeviceTable.md>)
- [patchManagement WorkstationTable](<../../pages/reports/patchManagement/Reporting Patch Management - WorkstationTable.md>)
- [SchedulesTable](<../../pages/scheduledReports/Reporting Scheduled Reports - SchedulesTable.md>), which uses `onRowClick` and `selectedKey`, and [RunsTable](<../../pages/scheduledReports/Reporting Scheduled Reports - RunsTable.md>)

## Key Behavior

- Header cells are bold, `nowrap`, and take `width` from the column; body cells only take `align`.
- `footer` is placed inside `TableBody`, so it must be a `TableRow` (or fragment of rows) to render validly.
- `size="small"` throughout; there is no pagination, so callers paginate or cap rows themselves.
- `onRowClick` fires for a click anywhere in the row; a cell with its own controls must stop propagation itself, as `SchedulesTable` does for its action cell.

## Cleanup Notes

- None noted.

## Source

[client/src/components/report/DataTable.tsx](../../../../client/src/components/report/DataTable.tsx)
