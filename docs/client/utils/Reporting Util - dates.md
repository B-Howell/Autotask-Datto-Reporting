# dates util

> Month names, the year range for pickers, the export filename date stamp, report heading dates and the two date parsers the client needs.

## Purpose

`client/src/utils/dates.ts` collects the handful of date rules that would otherwise be duplicated across pages and export builders: how a month is named, which years a month/year picker offers, how today's date appears in a file name and in a report heading, and how the server's `MM/DD/YYYY` strings and ISO timestamps are turned into `Date` objects. No date library is used; the native `Date` and `toLocale*` functions cover every case.

## Interface

| Export | Signature | Description |
|---|---|---|
| `MONTH_NAMES` | `readonly ['January', ..., 'December']` | Index 0 is January; add one for a server `month`. |
| `MonthName` | type | Union of the twelve names. |
| `reportYears` | `(now = new Date()) => number[]` | `2024` through next year, ascending. |
| `fileDateStamp` | `(now = new Date()) => string` | `M-D-YY`, for example `10-9-26`. |
| `longDate` | `(now = new Date()) => string` | `October 9, 2026`, en-US long form. |
| `parseUsDate` | `(value: unknown) => Date \| null` | Strict `M/D/YYYY` or `MM/DD/YYYY` to a local `Date`; `null` for anything else. |
| `formatDateTime` | `(iso: string \| null \| undefined) => string` | `toLocaleString()` of an ISO timestamp; `''` for empty, the raw string if unparseable. |

## Uses

- Nothing; this file has no imports.

## Used By

- [MonthYearSelect](<../components/report/Reporting Report Component - MonthYearSelect.md>) (`MONTH_NAMES`, `MonthName`, `reportYears`).
- [SlaPerformance](<../pages/reports/Reporting Page - SlaPerformance.md>) and [Tickets](<../pages/reports/Reporting Page - Tickets.md>) pages (`MONTH_NAMES`, `MonthName`).
- Export builders: [deviceReports excelExport](<../pages/reports/deviceReports/Reporting Device Report - excelExport.md>) and [slaPerformance excelExport](<../pages/reports/slaPerformance/Reporting SLA - excelExport.md>) (`parseUsDate`), [patchManagement pdfExport](<../pages/reports/patchManagement/Reporting Patch Management - pdfExport.md>) and [officeWindows reportRows](<../pages/reports/officeWindows/Reporting Office Windows - reportRows.md>) (`fileDateStamp`), [officeWindows wordExport](<../pages/reports/officeWindows/Reporting Office Windows - wordExport.md>) (`longDate`).
- [DeviceReports](<../pages/reports/Reporting Page - DeviceReports.md>) and [HddTickets](<../pages/reports/Reporting Page - HddTickets.md>) pages (`fileDateStamp`).
- [SavedReportsTable](<../pages/reports/savedReports/Reporting Saved Reports - SavedReportsTable.md>) and [DataSyncSection](<../pages/settings/Reporting Settings - DataSyncSection.md>) (`formatDateTime`).
- [pdf util](<Reporting Util - pdf.md>) (`longDate`).

## Key Behavior

- `reportYears` starts at the hard-coded `FIRST_REPORT_YEAR = 2024` and always includes next year so a December report can be prepared ahead.
- `fileDateStamp` is not zero-padded (`1-5-26`, not `01-05-26`), so filenames do not sort chronologically as strings; it matters because saved reports de-duplicate on the exact filename.
- `parseUsDate` builds the date with the local-time constructor, so a date-only value stays on the intended calendar day in the user's zone; `Number.isNaN(d.getTime())` rejects impossible dates the regex let through, such as month 13.
- `parseUsDate` is used by the Excel exports to write real date cells instead of strings, so Excel can sort and filter them.
- `formatDateTime` returns the input unchanged when `Date` cannot parse it, which surfaces a bad server timestamp on screen rather than hiding it.
- `reportYears`, `fileDateStamp` and `longDate` take an optional `now` so tests can pin the date.

## Cleanup Notes

- `FIRST_REPORT_YEAR` is a constant in code rather than configuration; a deployment with older history would need a code change.

## Source

[client/src/utils/dates.ts](../../../client/src/utils/dates.ts)
