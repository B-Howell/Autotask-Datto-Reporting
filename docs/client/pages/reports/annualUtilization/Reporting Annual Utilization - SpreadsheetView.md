# Annual Utilization SpreadsheetView

> Renders the current annual report tab as a sortable, filterable data grid for the spreadsheet view mode.

## Purpose

Some users want to sort and filter the annual figures rather than read a formatted table. This component wraps the app's shared data grid around a `TabGrid` built by `gridForTab`, so the page switches view modes by swapping one component for another. It is a stateless presentational component in the Annual Utilization folder.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `grid` | `TabGrid` | yes | The columns and rows for the open tab, from `gridForTab`. |

## Uses

- `@mui/material` `Box`.
- [AppDataGrid](<../../../components/Reporting Component - AppDataGrid.md>), the shared MUI X DataGrid wrapper.
- [gridModels](<Reporting Annual Utilization - gridModels.md>) for the `GridRow` and `TabGrid` types.

## Used By

- [AnnualUtilization page](<../Reporting Page - AnnualUtilization.md>)

## Key Behavior

- The grid fills `calc(100vh - 320px)` of height and the full width, so it scrolls internally.
- Density is `compact`, row selection on click is disabled, and pagination is fixed at 100 rows per page with no other page size offered, matching the raw entries table.
- All column typing and formatting is decided in `gridModels`; this component adds nothing per tab, so the same instance serves the summary, raw entries and agency detail grids.
- Because the page memoises `grid` on the tab and its sources, switching tabs replaces the rows and columns in place; the grid's sort and filter state is not preserved across tabs.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/annualUtilization/SpreadsheetView.tsx](../../../../../client/src/pages/reports/annualUtilization/SpreadsheetView.tsx)
