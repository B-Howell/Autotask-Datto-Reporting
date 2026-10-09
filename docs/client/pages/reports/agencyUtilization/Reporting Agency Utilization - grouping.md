# Agency Utilization grouping

> Two small helpers that regroup the server's flat worker rows by billing category and sum a per-company hours map.

## Purpose

The utilization payload lists one row per (category, worker) with hours keyed by company. Both the on-screen table and the Excel export need those rows bucketed by category so each department can be rendered as a header with its people beneath it. Keeping the regrouping here means the table and the workbook cannot drift in how they bucket rows. This is a pure util with no React or I/O.

## Interface

| Export | Description |
|---|---|
| `groupRowsByCategory(rows)` | `Record<category, UtilizationRow[]>`. Accepts `undefined` and returns an empty object for it. |
| `sumHours(byCompany)` | Sum of every value in a `Record<string, number>`. |

## Uses

- `UtilizationRow` type from [API types](<../../../api/Reporting API - types.md>).

## Used By

- [UtilizationTable](<Reporting Agency Utilization - UtilizationTable.md>)
- [excelExport](<Reporting Agency Utilization - excelExport.md>)

## Key Behavior

- Row order within a category is the server's order: the [utilization service](<../../../../server/services/Reporting Service - utilization.md>) emits categories sorted alphabetically and workers sorted alphabetically within each. Nothing here re-sorts.
- Categories are keyed by the raw `category` string. The annual report aliases category names through `normalizeCategory`; the quarterly report does not, so a category appears under exactly the name the server sent.
- `sumHours` is a plain float sum with no rounding. Callers round at display time (`fmtHours`) or at export time (`round2`).
- The server rounds each worker-company value and each total to two decimals, so a client-side `sumHours` over a worker's `byCompany` can differ from a server-computed figure only by floating-point noise; the table uses `sumHours` for row totals and the server's figures for the grand total.

## Cleanup Notes

- No unit tests for either helper, though both are trivial.

## Source

[client/src/pages/reports/agencyUtilization/grouping.ts](../../../../../client/src/pages/reports/agencyUtilization/grouping.ts)
