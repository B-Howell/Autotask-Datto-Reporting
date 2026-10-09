# SLA formatters

> Percentage formatting, the traffic-light colour rule and the Grand Total row style shared by the SLA pivot tables.

## Purpose

The two pivot components show the same metrics and must colour them identically, so the display rules live here rather than in either table. Pure functions and one `sx` object, no React.

## Interface

| Export | Description |
|---|---|
| `fmtPct(v)` | Formats a fraction as a percentage with one decimal, for example `0.9512` becomes `95.1%`. |
| `pctColor(v)` | Theme palette key: `success.main` at or above 0.95, `warning.main` at or above 0.8, `error.main` below. |
| `grandTotalRowSx` | `SxProps`: a faint blue background (different alpha per light or dark mode) and `fontWeight: 800` on every cell. |

## Uses

- `SxProps` and `Theme` types from `@mui/material/styles`.

## Used By

- [PivotTable](<Reporting SLA - PivotTable.md>).
- [IssueTypePivotTable](<Reporting SLA - IssueTypePivotTable.md>).

## Key Behavior

- Inputs are fractions (0 to 1) as produced by `pivots.ts`; `fmtPct` multiplies by 100 and uses `toFixed(1)`, so `1` prints as `100.0%` and `0` as `0.0%`.
- The thresholds are inclusive: exactly 0.95 is green and exactly 0.8 is amber.
- A group with no measurable tickets averages to 0 and therefore shows red `0.0%`; the formatter does not distinguish "no data" from "none met".
- The Grand Total background is `rgba(59,130,246,0.08)` in dark mode and `rgba(29,78,216,0.06)` in light mode, keeping the shared export blue as the base hue.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/slaPerformance/formatters.ts](../../../../../client/src/pages/reports/slaPerformance/formatters.ts)
