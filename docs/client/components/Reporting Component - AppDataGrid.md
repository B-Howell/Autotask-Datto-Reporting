# AppDataGrid

> Thin wrapper around MUI DataGrid that reserves a gutter for the grid's floating scrollbar so cells are never drawn under it.

## Purpose

DataGrid v8 draws its own floating scrollbar, clamped to 14 px, over the rightmost column whenever the native scrollbar measures 0 (styled or overlay scrollbars, which this app uses). Every grid in the app would need the same CSS fix, so it lives here once. It is in the component layer and is the only way the app renders a DataGrid.

## Interface

Generic over the row model: `AppDataGrid<R extends GridValidRowModel>(props: DataGridProps<R> & { ref? })`.

| Prop | Type | Required | Description |
|---|---|---|---|
| `...rest` | `DataGridProps<R>` | per DataGrid | Passed straight through. |
| `sx` | `SxProps<Theme>` | no | Merged after the scrollbar fix, so callers can override it. |
| `ref` | `ForwardedRef<HTMLDivElement>` | no | Forwarded to the DataGrid root. |

## Uses

- `react` (`forwardRef`)
- `@mui/x-data-grid` (`DataGrid`, types)
- `@mui/material/styles` types

## Used By

- [DeviceSpreadsheet](<Reporting Component - DeviceSpreadsheet.md>)
- [annualUtilization SpreadsheetView](<../pages/reports/annualUtilization/Reporting Annual Utilization - SpreadsheetView.md>)
- [slaPerformance RawDataGrid](<../pages/reports/slaPerformance/Reporting SLA - RawDataGrid.md>)

## Key Behavior

- Sets `scrollbarSize={14}` and the `--DataGrid-scrollbarSize` CSS variable to the same value, then pads `.MuiDataGrid-main` on the right and bottom by that size multiplied by the grid's own `--DataGrid-hasScrollY` and `--DataGrid-hasScrollX` flags, so the gutter only appears on the axes that scroll.
- `toSxArray` normalises the caller's `sx` (undefined, object or array) into an array so it can be spread after the fix; later entries win in MUI's `sx` array merge.
- The `forwardRef` result is cast back to a generic function type so `AppDataGrid<DeviceRow>` keeps row typing at call sites, which plain `forwardRef` loses.

## Cleanup Notes

- None noted.

## Source

[client/src/components/AppDataGrid.tsx](../../../client/src/components/AppDataGrid.tsx)
