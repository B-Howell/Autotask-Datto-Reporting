# deviceReportStore

> Persisted column-visibility preference for the device inventory grid.

## Purpose

The device grid has dozens of columns and most users only want a handful. This store remembers which fields the user chose to show, and in what order, across reloads. It is in the store layer and is kept separate from `deviceDataStore` because a preference should outlive the fetched data it applies to.

## Interface

Not created by the `reportDataStore` factory.

| Field / action | Type | Description |
|---|---|---|
| `visibleFields` | `string[] \| null` | Ordered grid field names to show. null means no preference saved: show every column. |
| `setVisibleFields(fields)` | `(string[]) => void` | Persists to `localStorage` under `deviceReport.visibleFields`, then updates state. |

## Uses

- `zustand` (`create`)
- `localStorage`

## Used By

- [useVisibleColumns](<../pages/reports/deviceReports/Reporting Device Report - useVisibleColumns.md>), which applies the saved list to the current column schema and feeds the column chooser

## Key Behavior

- The value is read once at module load with try/catch around both `getItem` and `JSON.parse`; any failure yields null.
- Writes are wrapped in try/catch too; if storage is unavailable the preference still updates in memory for the session.
- The stored list is a list of grid field names (`rowNumber`, `col0`, `company`), not header names, so it only stays meaningful while the sheet schema keeps its column order. `useVisibleColumns` drops any saved field the current schema no longer has.
- There is no action to clear the preference back to null.

## Cleanup Notes

- None noted.

## Source

[client/src/store/deviceReportStore.ts](../../../client/src/store/deviceReportStore.ts)
