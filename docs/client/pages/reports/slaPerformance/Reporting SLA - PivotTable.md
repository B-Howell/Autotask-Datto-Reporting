# PivotTable

> The flat pivot table used by the "Pivot by Resource" and "Pivot by Priority" tabs.

## Purpose

Two of the three SLA pivots have one grouping level and the same four columns, so one component renders both; only the first column heading differs. It takes rows in the server's `SlaPivotRow` shape (`resource` holds the group label whatever the grouping is) and styles the Grand Total row. Presentational, page layer.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `pivot` | `SlaPivotRow[]` | yes | Rows from `buildPivot`, with the Grand Total row last. |
| `rowLabel` | `string` | no | Heading of the label column; defaults to "Resource". The page passes "Priority" for the second tab. |

## Uses

- `@mui/material` table primitives.
- `fmtPct`, `pctColor`, `grandTotalRowSx` from [formatters](<Reporting SLA - formatters.md>); `GRAND_TOTAL` from [pivots](<Reporting SLA - pivots.md>).
- `SlaPivotRow` type from [API types](<../../../api/Reporting API - types.md>).

## Used By

- [SlaPerformance page](<../Reporting Page - SlaPerformance.md>), on tab indexes 1 and 2.

## Key Behavior

- Columns: the label, "Average of First Response Met", "Average of Resolved Met", "Tickets"; the three metric columns are centred.
- Percentages are formatted to one decimal by `fmtPct` and coloured by `pctColor` (success at or above 0.95, warning at or above 0.8, error otherwise).
- A row whose `resource` equals `GRAND_TOTAL` gets the tinted background and bold cells from `grandTotalRowSx`, and its label is rendered at weight 800. The component does not reorder rows; the builders already place the total last.
- Rows are keyed by index, which is safe because the table is re-rendered wholesale from a memoised pivot.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/slaPerformance/PivotTable.tsx](../../../../../client/src/pages/reports/slaPerformance/PivotTable.tsx)
