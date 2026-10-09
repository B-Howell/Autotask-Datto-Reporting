# Annual Utilization departments

> The category alias table and the helpers that pick which of the tenant's billing tiers, and which rates, apply to an annual report.

## Purpose

The server reports hours by billing tier (the role a time entry was booked under, mapped through `ROLE_TO_TIER` in the [report rules](<../../../../server/Reporting Server - report_rules.md>)). The annual report turns those hours into a cost, which needs a rate per tier. The list of tiers, their default rates and their display order are deployment data held in the tenant store; this util does not read the store, it takes the list as an argument and applies it to a report. It is a pure util in the Annual Utilization folder.

## Interface

| Export | Description |
|---|---|
| `RatedDepartment` | `{ department, rate }`, re-exported from the API types. |
| `CATEGORY_ALIASES` | `{ 'Level 0 - Administration': 'Administration' }`. |
| `normalizeCategory(name)` | The alias target if there is one, otherwise the name unchanged. |
| `departmentsIn(utilData, departments)` | The entries of `departments` whose name matches at least one (normalised) row category in the report, in list order; `null` data gives an empty list. |
| `withDefaultRates(overrides, departments)` | The standard rates of `departments` with the saved overrides laid on top. |

`departments` is the tenant's `ratedDepartments` list in both cases: Administration 0, Call Center 65, Help Desk 75, Jr Sys Admin 80, Sr Sys Admin 90 (dollars per hour) until the settings load.

## Uses

- `RatedDepartment`, `UtilizationReport` types from [API types](<../../../api/Reporting API - types.md>).
- `Rates` type from [annualUtilizationStore](<../../../store/Reporting Store - annualUtilizationStore.md>).

## Used By

- [summary](<Reporting Annual Utilization - summary.md>) (`CATEGORY_ALIASES`, `normalizeCategory`, `RatedDepartment`)
- [useAnnualReport](<Reporting Annual Utilization - useAnnualReport.md>) (`departmentsIn`, `withDefaultRates`, each given the list it subscribes to from the [tenantStore](<../../../store/Reporting Store - tenantStore.md>))
- [excelExport](<Reporting Annual Utilization - excelExport.md>) (`RatedDepartment`)
- [client/src/pages/reports/annualUtilization/departments.test.ts](../../../../../client/src/pages/reports/annualUtilization/departments.test.ts)

[ReportSettingsDialog](<Reporting Annual Utilization - ReportSettingsDialog.md>) no longer imports from here; it subscribes to the tenant store's list directly.

## Key Behavior

- Tier order is fixed by the tenant's list, not by the server's alphabetical `categories`, so the summary reads in the order the deployment wrote its departments (cheapest to most expensive in the defaults).
- Administration carries a rate of 0 in the defaults: its hours appear in the summary but contribute no cost.
- Only tiers present in the data get a row. A report with no Call Center time has no Call Center column; this also drives which columns the Excel summary sheet has.
- Any category the server sends that is not in the list is dropped from the annual report entirely (it still appears in the quarterly report). The server's `ROLE_TO_TIER` currently maps every role to one of the five default names, folding "Level 5 - Specialist" into Sr Sys Admin, so nothing is lost today; a deployment that adds a role on the server adds the matching department to `data/tenant.json`.
- The list is a required parameter rather than a store read, so this module has no store dependency and the tests pass literal lists. `useAnnualReport` subscribes to the store and passes the list into both memoised calls, so they recompute when the settings arrive after the page's first render.
- The alias table covers snapshots whose category is the raw Autotask role name rather than the tier. The server now maps that role to `Administration` itself, so the alias is a fallback for older stored data.
- `Rates` values may be strings because the settings dialog stores raw input text; `withDefaultRates` does not coerce, and `buildSummary` applies `Number(...) || 0`.

## Cleanup Notes

- Tier names now live in two server-side places, `report_rules.py` (what a role maps to) and `data/tenant.json` (what the client prices), and nothing checks that they agree.
- The alias table is still a literal in client source; it describes Autotask role naming rather than a deployment choice, so it stays here for now.

## Source

[client/src/pages/reports/annualUtilization/departments.ts](../../../../../client/src/pages/reports/annualUtilization/departments.ts)
