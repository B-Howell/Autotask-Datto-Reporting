# Annual Utilization departments

> The billing tiers the annual report prices, their standard hourly rates, the category alias table, and the helpers that pick which tiers and rates apply to a report.

## Purpose

The server reports hours by billing tier (the role a time entry was booked under, mapped through `ROLE_TO_TIER` in the [report rules](<../../../../server/Reporting Server - report_rules.md>)). The annual report turns those hours into a cost, which needs a rate per tier. This util is the client's single list of tiers, their default rates and their display order. It is a pure util in the Annual Utilization folder.

## Interface

| Export | Description |
|---|---|
| `RatedDepartment` | `{ department, rate }`. |
| `RATED_DEPARTMENTS` | In display order: Administration 0, Call Center 65, Help Desk 75, Jr Sys Admin 80, Sr Sys Admin 90 (dollars per hour). |
| `CATEGORY_ALIASES` | `{ 'Level 0 - Administration': 'Administration' }`. |
| `normalizeCategory(name)` | The alias target if there is one, otherwise the name unchanged. |
| `departmentsIn(utilData)` | The `RATED_DEPARTMENTS` whose name matches at least one (normalised) row category in the report; `null` data gives an empty list. |
| `withDefaultRates(overrides)` | The standard rates with the saved overrides laid on top. |

## Uses

- `UtilizationReport` type from [API types](<../../../api/Reporting API - types.md>).
- `Rates` type from [annualUtilizationStore](<../../../store/Reporting Store - annualUtilizationStore.md>).

## Used By

- [summary](<Reporting Annual Utilization - summary.md>) (`CATEGORY_ALIASES`, `normalizeCategory`, `RatedDepartment`)
- [useAnnualReport](<Reporting Annual Utilization - useAnnualReport.md>) (`departmentsIn`, `withDefaultRates`)
- [ReportSettingsDialog](<Reporting Annual Utilization - ReportSettingsDialog.md>) (`RATED_DEPARTMENTS`)
- [excelExport](<Reporting Annual Utilization - excelExport.md>) (`RatedDepartment`)

## Key Behavior

- Tier order is fixed by this list, not by the server's alphabetical `categories`, so the summary always reads from the cheapest tier to the most expensive.
- Administration carries a rate of 0: its hours appear in the summary but contribute no cost.
- Only tiers present in the data get a row. A report with no Call Center time has no Call Center column; this also drives which columns the Excel summary sheet has.
- Any category the server sends that is not in `RATED_DEPARTMENTS` is dropped from the annual report entirely (it still appears in the quarterly report). The server's `ROLE_TO_TIER` currently maps every role to one of these five names, folding "Level 5 - Specialist" into Sr Sys Admin, so nothing is lost today; a new role on the server would need a row here.
- The alias table covers snapshots whose category is the raw Autotask role name rather than the tier. The server now maps that role to `Administration` itself, so the alias is a fallback for older stored data.
- `Rates` values may be strings because the settings dialog stores raw input text; `withDefaultRates` does not coerce, and `buildSummary` applies `Number(...) || 0`.

## Cleanup Notes

- Rates and tier names are tenant-specific business data hard-coded in the client, while the server keeps its equivalents in `report_rules.py`; they are two sources of truth for the same tier names.
- No tests cover `departmentsIn` or the alias handling.

## Source

[client/src/pages/reports/annualUtilization/departments.ts](../../../../../client/src/pages/reports/annualUtilization/departments.ts)
