# Agency Utilization quarters

> Builds the list of selectable calendar quarters for the quarterly utilization report, picks the default one, and formats hour values for the table.

## Purpose

The quarterly report asks the server for an inclusive date range. This util turns "a quarter" into that range and produces the dropdown entries so the page never computes dates itself. It sits in the util layer of the Agency Utilization page folder and has no React in it.

The design decision is that a quarter is chosen as one item (`2025-Q3`) rather than from separate quarter and year inputs, and that the list only contains quarters that can hold data: nothing in the future.

## Interface

| Export | Description |
|---|---|
| `QuarterChoice` | `{ key, label, detail, start, end }`. `key` is `YYYY-Qn`, `label` is `Qn YYYY`, `detail` is the month span and year, `start` and `end` are inclusive `YYYY-MM-DD` dates. |
| `quarterChoices(now = dayjs())` | Every quarter from the current one back to Q1 of `EARLIEST_YEAR` (2023), newest first. |
| `defaultQuarterKey(now = dayjs())` | The key of the quarter that just ended. |
| `fmtHours(n)` | Hours rounded to two decimals as a string; `null`, `undefined` and `0` become an empty string. |

## Uses

- `dayjs` for month arithmetic and formatting.

## Used By

- [QuarterSelect](<Reporting Agency Utilization - QuarterSelect.md>) (the `QuarterChoice` type)
- [UtilizationTable](<Reporting Agency Utilization - UtilizationTable.md>) (`fmtHours`)
- [AgencyUtilization page](<../Reporting Page - AgencyUtilization.md>) (`quarterChoices`, `defaultQuarterKey`)

## Key Behavior

- Quarters are calendar quarters: Q1 is January to March, Q4 is October to December. They are not aligned to the September fiscal year used by the annual report. The server's `period_label` in the [utilization service](<../../../../server/services/Reporting Service - utilization.md>) recognises a calendar quarter and labels it `Qn YYYY`, which becomes the report's `periodLabel`.
- A quarter range starts on the first of its first month and ends on the day before the first of the month three months later, computed with `dayjs` in local time, so Q4 ends on 31 December.
- The loop walks years from the current year down to 2023 and quarters from 4 down to 1, skipping quarters of the current year that have not started. The quarter in progress is included with "in progress" appended to its `detail` so the user knows its data is partial.
- `defaultQuarterKey` returns the previous quarter; in January to March that is Q4 of the previous year. The page uses it as the initial selection so the default report is a complete one.
- `fmtHours` renders zero as blank so the table reads as a sparse matrix. It uses `toString`, so there is no thousands separator (the annual report's `hrs` formatter does add one).
- `EARLIEST_YEAR` is a hard-coded floor; data older than 2023 cannot be selected from the UI.

## Cleanup Notes

- `fmtHours` is a display formatter living in a date util; it would sit more naturally beside the table or in a shared formatting module.
- `EARLIEST_YEAR` should probably be configuration rather than a constant in the client.
- No unit tests cover `quarterChoices` or `defaultQuarterKey`, both of which depend on the current date and have year-boundary edge cases.

## Source

[client/src/pages/reports/agencyUtilization/quarters.ts](../../../../../client/src/pages/reports/agencyUtilization/quarters.ts)
