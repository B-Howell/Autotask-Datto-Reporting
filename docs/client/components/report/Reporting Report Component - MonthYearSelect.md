# MonthYearSelect

> The month and year dropdown pair used by the month-scoped reports.

## Purpose

The ticket and SLA reports are scoped to a calendar month. This component renders the two selects from the shared month names and the report year range so both pages look and behave the same. It is in the report component layer and returns a fragment, so it drops straight into `ReportToolbar`.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `month` | `MonthName` | yes | Selected month name. |
| `year` | `number` | yes | Selected year. |
| `onMonthChange` | `(month: MonthName) => void` | yes | Month change handler. |
| `onYearChange` | `(year: number) => void` | yes | Year change handler; receives a number. |

## Uses

- `@mui/material` (`TextField`, `MenuItem`)
- [dates util](<../../utils/Reporting Util - dates.md>) for `MONTH_NAMES`, `reportYears`, `MonthName`
- [tenantStore](<../../store/Reporting Store - tenantStore.md>) for `tenant.firstReportYear`

## Used By

- Re-exported by [the report component barrel](<Reporting Report Component - index.md>)
- [SlaPerformance page](<../../pages/reports/Reporting Page - SlaPerformance.md>)
- [Tickets page](<../../pages/reports/Reporting Page - Tickets.md>)

## Key Behavior

- Month values are the names from `MONTH_NAMES`; converting a name to a month number is the page's job.
- The year list comes from `reportYears(firstYear)` evaluated at render, where `firstYear` is a tenant store subscription, so it follows both the current date and the deployment's first report year, including when the settings arrive after the first paint.
- The year select's string value is converted with `Number` before the callback.
- Small size, 130 px and 100 px minimum widths.

## Cleanup Notes

- None noted.

## Source

[client/src/components/report/MonthYearSelect.tsx](../../../../client/src/components/report/MonthYearSelect.tsx)
