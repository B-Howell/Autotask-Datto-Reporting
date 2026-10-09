# Annual Utilization AgencyDetailTable

> One agency's annual detail as a table: each billed tier with the people in it, their hours for the year and the monthly average.

## Purpose

When an agency tab is open in table view, this component shows where that agency's hours went: which tiers, which engineers, and how that looks per month. It mirrors the agency sheet in the Excel export so what the account manager sees is what the client receives. It is a presentational component in the Annual Utilization folder with no state.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `company` | `string` | yes | The agency name, shown in the caption. |
| `periodLabel` | `string` | yes | The report's period label (for example `FY 2024-25`), shown in the caption. |
| `detail` | `DepartmentDetail[]` | yes | Output of `buildDetail` for this agency. |

## Uses

- `@mui/material` table primitives and `Typography`.
- [fiscalYear](<Reporting Annual Utilization - fiscalYear.md>) for `MONTHS_IN_YEAR`.
- [summary](<Reporting Annual Utilization - summary.md>) for `detailTotal`, `hrs` and the `DepartmentDetail` type.

## Used By

- [AnnualUtilization page](<../Reporting Page - AnnualUtilization.md>)

## Key Behavior

- The caption reads `<company> <dash> <periodLabel>` in secondary text above the table.
- Columns are `Resource` (60% width), `1 Year` and `Avg Monthly`, matching the agency sheet's header in the workbook.
- Each tier renders a bold row (name, `hrs(total)`, `hrs(total / 12)`) with its bottom border suppressed, followed by one indented secondary-coloured row per worker in the order `buildDetail` produced (hours descending).
- A final `Total` row with a heavier top border shows `detailTotal(detail)` and its twelfth, in bold tabular numerals.
- Because `hrs` renders zero as blank and `buildDetail` already drops zero-hour workers and empty tiers, no blank numeric cells appear in practice.
- Monthly averages always divide by twelve regardless of how much of the year has data; the picker's "runs past today" hint is the only warning about that.

## Cleanup Notes

- The worker row key is the worker's name; two rows for the same person within one tier cannot occur because the server emits one row per (tier, worker), but the key would collide if that changed.

## Source

[client/src/pages/reports/annualUtilization/AgencyDetailTable.tsx](../../../../../client/src/pages/reports/annualUtilization/AgencyDetailTable.tsx)
