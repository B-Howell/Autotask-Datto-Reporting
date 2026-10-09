# RawDataGrid

> The "Report" tab: every filtered SLA ticket in a sortable, filterable, paginated data grid.

## Purpose

The raw ticket list is the audit trail behind the pivots, so it is shown in the full MUI X DataGrid with sorting, column filters and pagination rather than a plain table. This component maps the shared `COLUMNS` definition into DataGrid column definitions once at module load and renders the Yes/No chips for the SLA-met flags. Presentational, page layer.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `tickets` | `SlaTicket[]` | yes | The filtered tickets from `useSlaFilters`. |

## Uses

- `@mui/material` (`Box`, `Chip`, `useTheme`); `@mui/x-data-grid` types.
- [AppDataGrid](<../../../components/Reporting Component - AppDataGrid.md>), the app's wrapped DataGrid.
- `COLUMNS` and the `SlaColumn` type from [columns](<Reporting SLA - columns.md>); `SlaTicket` type from [API types](<../../../api/Reporting API - types.md>).

## Used By

- [SlaPerformance page](<../Reporting Page - SlaPerformance.md>), on tab index 0.

## Key Behavior

- Each `SlaColumn` becomes a `GridColDef` with its label and width, `sortable` and `filterable` on. Columns flagged `numeric` get `type: 'number'`; columns flagged `met` get `type: 'boolean'` and a custom cell. Both kinds are centre-aligned (header and cells); everything else is left-aligned.
- The met cell renders nothing for null or undefined, otherwise an outlined `Chip` reading "Yes" (success colour) or "No" (error colour).
- Grid rows need an `id`: it is `ticketNumber`, falling back to the row index when the number is empty. Rows are memoised on `tickets`.
- Pagination defaults to 100 rows per page with options 50, 100 and 250; density is compact; row selection on click is disabled.
- The wrapper is sized to `calc(100vh - 380px)` with a 400px minimum, and its border, background and text colours are hard-coded per light or dark mode rather than taken from theme tokens.

## Cleanup Notes

- Two tickets sharing a `ticketNumber` would produce duplicate grid ids; the index fallback only covers an empty number.
- The wrapper colours (`#444`, `#ccc`, `#1e1e1e`, `#ddd`, `#111`) bypass the theme palette.

## Source

[client/src/pages/reports/slaPerformance/RawDataGrid.tsx](../../../../../client/src/pages/reports/slaPerformance/RawDataGrid.tsx)
