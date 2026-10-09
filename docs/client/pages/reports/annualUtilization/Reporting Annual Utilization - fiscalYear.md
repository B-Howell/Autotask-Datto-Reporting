# Annual Utilization fiscalYear

> Defines the September-to-August reporting year on the client, turns a chosen start month into a twelve-month date range, and picks the default year.

## Purpose

The annual utilization report covers one reporting year. The MSP's year runs September through August, so "last year" is not the calendar year and the page needs its own notion of a year start. This util owns that rule, the `DateRange` the picker and the fetch share, and the raw-entries tab sentinel. It is a pure util in the Annual Utilization folder.

The design decision is that a year can open in any month but is always exactly twelve whole months. Every monthly figure on the page is an annual figure divided by `MONTHS_IN_YEAR`; an arbitrary start and end would make all of them silently wrong.

## Interface

| Export | Description |
|---|---|
| `FISCAL_START_MONTH` | `9`. Mirrors `FISCAL_START_MONTH` in the server's [report rules](<../../../../server/Reporting Server - report_rules.md>); the two must agree. |
| `MONTHS_IN_YEAR` | `12`, the divisor for every per-month figure. |
| `RAW_TAB` | `'__datto__'`, the tab value for the raw entries sheet. Distinct from `''` (Summary) and from any agency name. |
| `DateRange` | `{ start, end, label, detail, incomplete }`; dates are inclusive `YYYY-MM-DD`. |
| `currentFiscalYear(now)` | The start year of the reporting year in progress: the calendar year if `now` is September or later, otherwise the previous year. |
| `rangeFromStartMonth(value)` | The `DateRange` opened by the given month, or `null` for a null or invalid date. |
| `defaultStartMonth(now)` | 1 September of `currentFiscalYear(now) - 1`: the last complete reporting year. |
| `rangeOrDefault(value)` | `rangeFromStartMonth(value)`, falling back to the default year's range so a cleared picker never yields no range. |

## Uses

- `dayjs` for month arithmetic and formatting.

## Used By

- [AnnualUtilization page](<../Reporting Page - AnnualUtilization.md>) (`RAW_TAB`, `defaultStartMonth`, `rangeOrDefault`)
- [YearStartPicker](<Reporting Annual Utilization - YearStartPicker.md>) (`DateRange`)
- [ReportTabs](<Reporting Annual Utilization - ReportTabs.md>), [useAnnualReport](<Reporting Annual Utilization - useAnnualReport.md>), [gridModels](<Reporting Annual Utilization - gridModels.md>) (`RAW_TAB`)
- [summary](<Reporting Annual Utilization - summary.md>), [AgencyDetailTable](<Reporting Annual Utilization - AgencyDetailTable.md>), [excelExport](<Reporting Annual Utilization - excelExport.md>) (`MONTHS_IN_YEAR`)

## Key Behavior

- Whatever day the picker returns, the range opens on the first of that month (`startOf('month')`) and ends the day before the same month next year, so August 2025 gives 1 Aug 2025 to 31 Jul 2026.
- `label` is `MMM YYYY` to `MMM YYYY` and `detail` is `D MMM YYYY` to `D MMM YYYY`, joined by a dash; the picker shows `detail` as helper text.
- `incomplete` is true when the end date is after today. The picker appends "runs past today" so the user knows the monthly averages are being divided by months that have no data yet.
- The default is the last complete year, not the one in progress, because an in-progress year understates every figure on the page.
- The server labels a range starting on 1 September and spanning twelve months as `FY YYYY-YY` (for example `FY 2024-25`), a January start as the plain year, and any other twelve-month window as a date span. That `periodLabel` names the Excel file and the agency detail caption.

## Cleanup Notes

- `FISCAL_START_MONTH` is duplicated between client and server with no shared source; a change on one side would not be caught by any test.
- No unit tests cover the September boundary in `currentFiscalYear` or the leap-day case in `rangeFromStartMonth`.

## Source

[client/src/pages/reports/annualUtilization/fiscalYear.ts](../../../../../client/src/pages/reports/annualUtilization/fiscalYear.ts)
