# useVisibleColumns

> Hook that applies the user's saved column choice to the device grid's current schema and derives the chooser and export column sets.

## Purpose

The device sheet's columns come from the server and can change between runs; the user's
preferred column list is persisted in the device report store (local storage). This hook
reconciles the two. It also separates the `rowNumber` column, which is always shown first and
never offered in the column chooser, from the columns the user controls.

The design decision, stated in the source comment, is that a saved list is respected exactly,
only dropping fields the schema no longer has. New server fields are not auto-added because
that would re-show columns the user deliberately hid.

## Interface

`useVisibleColumns(columns: GridColDef<DeviceRow>[])` returns:

| Name | Type | Description |
|---|---|---|
| `displayedColumns` | `GridColDef<DeviceRow>[]` | Columns to render in the grid, in saved order. |
| `chooserFields` | `string[]` | Visible fields without `rowNumber`, for the chooser's checked set. |
| `chooserColumns` | `GridColDef<DeviceRow>[]` | All schema columns without `rowNumber`, for the chooser's list. |
| `exportColumns` | `GridColDef<DeviceRow>[]` | Columns for the workbook: `chooserFields` resolved against the schema. |
| `applyVisibleFields` | `(fields: string[]) => void` | Saves a new choice, re-pinning `rowNumber` to the front. |

## Uses

- `react` (`useMemo`) and the `GridColDef` type from `@mui/x-data-grid`.
- [deviceReportStore](<../../../store/Reporting Store - deviceReportStore.md>) for
  `visibleFields` and `setVisibleFields`.
- [sheetRows](<Reporting Device Report - sheetRows.md>) for the `DeviceRow` type.

## Used By

- [DeviceReports page](<../Reporting Page - DeviceReports.md>)

## Key Behavior

- When the store holds no array (`null`, no preference saved) every schema field is visible
  in schema order.
- With a saved array, the result is the saved list filtered to fields present in the schema,
  preserving the saved order. A field saved but now absent is dropped silently.
- `pickColumns` resolves field names to column definitions and discards unknown names, so
  `displayedColumns` can never contain `undefined`.
- `applyVisibleFields` prepends `rowNumber` only if the current schema has that column;
  otherwise the list is saved as given.
- `visibleFields` and `displayedColumns` are memoised on `columns` and the saved list;
  `chooserFields`, `chooserColumns` and `exportColumns` are recomputed every render.

## Cleanup Notes

- No test covers the "saved list respected exactly" rule, which is the one behaviour a
  maintainer is most likely to change by accident.

## Source

[client/src/pages/reports/deviceReports/useVisibleColumns.ts](../../../../../client/src/pages/reports/deviceReports/useVisibleColumns.ts)
