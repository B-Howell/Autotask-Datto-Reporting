# Annual Utilization summary

> Derives the per-agency, per-tier hours and costs of the annual report from the server's utilization payload, plus the number formatters the page shares.

## Purpose

The server returns hours by tier, worker and company for the year. This util applies the hourly rates to those hours and restates everything per month, because the question the annual report answers is "how does an average month compare with what the client pays for". It also builds one agency's detail (tiers, people, hours) for the agency tabs. It is a pure util in the Annual Utilization folder; the page's hook memoises its outputs.

## Interface

| Export | Description |
|---|---|
| `hrs(n)` | Hours rounded to two decimals with `toLocaleString()`; zero or undefined gives an empty string. |
| `money(n)` | US dollars with no decimals via `toLocaleString`; zero or undefined gives an empty string. |
| `CompanyFigures` | `{ annualHours, hours, cost }`: hours is per month, cost is per month. |
| `DepartmentSummary` | A `RatedDepartment` plus `byCompany: Record<company, CompanyFigures>`. |
| `CompanyTotals` | `{ hours, cost, annualHours, annualCost }`. |
| `Summary` | `{ perDept: DepartmentSummary[], totals: Record<company, CompanyTotals> }`. |
| `DepartmentDetail` | A `RatedDepartment` plus `workers: { worker, hours }[]` and `total`. |
| `SummaryRow` | `CompanyTotals & { company }`. |
| `buildSummary(utilData, rates, companies, departments)` | The `Summary` for the given companies and tiers. |
| `buildDetail(utilData, company, departments)` | One agency's tiers with the people who booked time to it; empty for `''`. |
| `summaryRowsOf(summary, companies)` | One `SummaryRow` per company, sorted alphabetically by name. |
| `detailTotal(detail)` | Sum of every tier's total in a detail. |

## Uses

- [departments](<Reporting Annual Utilization - departments.md>) for `CATEGORY_ALIASES`, `normalizeCategory`, `RatedDepartment`.
- [fiscalYear](<Reporting Annual Utilization - fiscalYear.md>) for `MONTHS_IN_YEAR`.
- `UtilizationReport` from [API types](<../../../api/Reporting API - types.md>); `Rates` from [annualUtilizationStore](<../../../store/Reporting Store - annualUtilizationStore.md>).

## Used By

- [useAnnualReport](<Reporting Annual Utilization - useAnnualReport.md>), [gridModels](<Reporting Annual Utilization - gridModels.md>), [excelExport](<Reporting Annual Utilization - excelExport.md>)
- [SummaryTable](<Reporting Annual Utilization - SummaryTable.md>), [AgencyDetailTable](<Reporting Annual Utilization - AgencyDetailTable.md>), [RawEntriesTable](<Reporting Annual Utilization - RawEntriesTable.md>)
- [AnnualUtilization page](<../Reporting Page - AnnualUtilization.md>) (`hrs`, `Summary`)

## Key Behavior

- Rate resolution per tier: `Number(rates[department] ?? d.rate) || 0`. A saved override wins over the standard rate; a blank or non-numeric override becomes 0, not the default.
- Annual hours per (tier, company) come from the server's `categoryTotals`, the same figures the quarterly report shows, so the two reports agree on a shared period. The alias lookup reads `categoryTotals['Level 0 - Administration']` when there is no `Administration` key.
- Monthly hours are `annualHours / 12`; monthly cost is `monthly hours x rate`. The rate is applied to the tier, never to the individual, so a person's hours cost the same whichever tier colleague did them.
- Company totals sum the monthly figures across tiers, then `annualHours` and `annualCost` are those monthly sums multiplied back by 12. Annual cost is therefore twelve times the monthly cost, not a separately computed figure.
- `companies` is the user's selected subset, so a deselected agency is absent from `totals` and from every "All agencies" sum.
- `buildDetail` works from `rows` (per worker), not `categoryTotals`: it keeps workers with more than zero hours for the company, sorts them by hours descending, and drops tiers with no workers.
- `money` rounds to whole dollars at display time; costs are kept unrounded in the `Summary`.

## Cleanup Notes

- `buildSummary` reads `d.byCompany[c]` for every selected company; `SummaryTable` and `gridModels` index `byCompany[row.company]` without a guard, which is safe only because both are built from the same `companies` list.
- No unit tests cover the rate override, alias fallback or monthly division, which are the figures clients are billed against.

## Source

[client/src/pages/reports/annualUtilization/summary.ts](../../../../../client/src/pages/reports/annualUtilization/summary.ts)
