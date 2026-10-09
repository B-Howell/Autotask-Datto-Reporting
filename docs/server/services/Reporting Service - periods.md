# Periods service

> Picks the period a scheduled run reports on, relative to the day it runs: the previous month, the previous calendar quarter, or the reporting year the previous month belongs to.

## Purpose

A schedule fires early in a month and sends a report about time that has finished. Monthly reports (SLA, tickets, patching as of month end) cover the month before the run; the quarterly utilization report covers the calendar quarter before the run; the annual utilization report covers the reporting year that the previous month falls in, so a schedule on 1 September sends the year that just closed in August, and one on 1 October sends the year that started in September. This module answers "which period" for a given run date. It deliberately holds no calendar arithmetic of its own: the inclusive date ranges come from the helpers in the [utilization service](<Reporting Service - utilization.md>), which already define a quarter and the reporting year for the interactive reports, so a scheduled run and an on-screen run can never disagree about where a period starts and ends.

## Interface

| Name | Description |
|---|---|
| `previous_month(today)` | `(year, month)` of the month before `today`'s month; January rolls back to December of the previous year. |
| `previous_quarter(today)` | `(start, end)` ISO date strings, inclusive, of the calendar quarter before the one containing `today`; Q1 rolls back to Q4 of the previous year. |
| `fiscal_year_of_previous_month(today)` | `(start, end)` ISO date strings, inclusive, of the reporting year that contains the previous month. |

`today` is a `datetime.date` (a `datetime` works too, since only `.year` and `.month` are read). The tuples are what the report requests take: `(year, month)` for the monthly reports and an ISO date range for utilization.

## Uses

- Standard library `datetime.date`.
- [utilization service](<Reporting Service - utilization.md>) for `quarter_range(year, quarter)`, `fiscal_year_range(start_year)` and `current_fiscal_year(today)`. The reporting year's start month is `FISCAL_START_MONTH` in [report_rules](<../Reporting Server - report_rules.md>), read by the utilization module; this module does not import the rule itself.

## Used By

- [server/tests/test_periods.py](../../../server/tests/test_periods.py).
- The scheduler loop that the scheduled-delivery branch adds next, to build the render request for a due schedule from its preset's report type.

## Key Behavior

- `previous_quarter` works out the quarter `today` is in (`(month - 1) // 3 + 1`), steps back one with a year rollback from Q1 to Q4, and hands the pair to `utilization.quarter_range`, which produces the inclusive end by subtracting a day from the following quarter's first day. Run on 1 Oct 2026 that is `2026-07-01` to `2026-09-30`; run on 3 Feb 2026 it is `2025-10-01` to `2025-12-31`.
- `fiscal_year_of_previous_month` takes the first of the previous month and asks `utilization.current_fiscal_year` which reporting year that date sits in (the start year, which is the date's own year when its month is at or past `FISCAL_START_MONTH` and the year before otherwise), then `utilization.fiscal_year_range` for the inclusive range. With the default September start, a run on 1 Oct 2026 gives `2026-09-01` to `2027-08-31` (the year in progress, one month in) and a run on 1 Sep 2026 gives `2025-09-01` to `2026-08-31` (the year that just ended). With `FISCAL_START_MONTH = 1` the result is the calendar year containing the previous month: a run on 1 Jan 2026 gives all of 2025.
- Because the rule is read where the arithmetic lives, a test or override that changes `FISCAL_START_MONTH` must change it on the utilization module (or through `report_rules_local.py` before import), not on this one; the tests do exactly that.
- Nothing here looks at the day of the month: a schedule that runs on the 15th still reports on the previous month. The schedules service lets a user pick any day, and a mid-month run is a deliberate way to send a report after the vendor data has settled.

## Cleanup Notes

- Importing this module imports the utilization service, which in turn imports the Autotask client. That is already true of every router, so it costs nothing in the server, but a tool that only wants the period arithmetic pays for the import chain.
- There is no "previous year" for a monthly report run in January that wants the whole of last year; the annual report is defined by the reporting year, and a calendar year is only available by setting `FISCAL_START_MONTH` to 1.

## Source

[server/services/periods.py](../../../server/services/periods.py)
