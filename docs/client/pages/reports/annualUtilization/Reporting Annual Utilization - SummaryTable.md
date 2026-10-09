# Annual Utilization SummaryTable

> The annual summary table: one line per agency with annual hours by billing tier, then yearly and monthly hours and cost, and an all-agencies footer.

## Purpose

This is the first thing an account manager sees on the annual report: how much of each tier every agency consumed and what that costs at the standard rates, per year and per average month. Clicking an agency name opens its detail tab. It is a presentational component in the Annual Utilization folder; the figures come pre-computed from `buildSummary`.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `summary` | `Summary` | yes | Per-tier figures for the selected companies. |
| `rows` | `SummaryRow[]` | yes | One row per company, alphabetical, from `summaryRowsOf`. |
| `onSelectCompany` | `(company: string) => void` | yes | Called with the agency name when its cell is clicked. |

## Uses

- `@mui/material` table primitives.
- [summary](<Reporting Annual Utilization - summary.md>) for `hrs`, `money` and the `CompanyTotals`, `Summary`, `SummaryRow` types.

## Used By

- [AnnualUtilization page](<../Reporting Page - AnnualUtilization.md>)

## Key Behavior

- Column order: `Agency`, one column per tier in `summary.perDept` (display order from `RATED_DEPARTMENTS`), then `Hours per year`, `Cost per year`, `Hours per month`, `Cost per month`.
- Tier cells show that agency's annual hours for the tier via `hrs`; zero shows a dash in the disabled text colour so the eye skips it.
- The agency cell is styled as a link (primary colour, pointer, underline on hover) and calls `onSelectCompany`, which the page wires to `setTab`.
- The four total columns read `row[key]` through a `TOTAL_COLUMNS` table pairing each key with its formatter, so hours use `hrs` and costs use `money` (whole dollars).
- The `All agencies` footer sums only the `rows` it was given, which are the selected companies; deselecting an agency removes it from the footer as well.
- Totals are bold tabular numerals; the footer has a heavier top border.

## Cleanup Notes

- The footer recomputes sums on every render with `reduce` inside JSX; cheap at current sizes but easy to memoise.

## Source

[client/src/pages/reports/annualUtilization/SummaryTable.tsx](../../../../../client/src/pages/reports/annualUtilization/SummaryTable.tsx)
