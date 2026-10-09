# dates util

> Month names, the year range for pickers, the export filename date stamp, report heading dates and the two date parsers the client needs.

## Purpose

`client/src/utils/dates.ts` collects the handful of date rules that would otherwise be duplicated across pages and export builders: how a month is named, which years a month/year picker offers, how today's date appears in a file name and in a report heading, and how the server's `MM/DD/YYYY` strings and ISO timestamps are turned into `Date` objects. No date library is used; the native `Date` and `toLocale*` functions cover every case.

## Interface

| Export | Signature | Description |
|---|---|---|
| `MONTH_NAMES` | `readonly ['January', ..., 'December']` | Index 0 is January; add one for a server `month`. |
| `MonthName` | type | Union of the twelve names. |
| `reportYears` | `(firstYear: number, now = new Date()) => number[]` | `firstYear` through next year, ascending. The caller passes the tenant's `firstReportYear`; a floor later than next year is clamped to next year. |
| `fileDateStamp` | `(now = new Date()) => string` | `M-D-YY`, for example `10-9-26`. |
| `longDate` | `(now = new Date()) => string` | `October 9, 2026`, en-US long form. |
| `parseUsDate` | `(value: unknown) => Date \| null` | `M/D/YYYY` or `MM/DD/YYYY` to a local `Date`; `null` for anything else. |
| `formatDateTime` | `(iso: string \| null \| undefined) => string` | `toLocaleString()` of an ISO timestamp; `''` for empty, the raw string if unparseable. |

## Uses

- Nothing; this file has no imports.

## Used By

- [MonthYearSelect](<../components/report/Reporting Report Component - MonthYearSelect.md>) (`MONTH_NAMES`, `MonthName`, `reportYears`, passing the `firstReportYear` it subscribes to from the [tenantStore](<../store/Reporting Store - tenantStore.md>)).
- [SlaPerformance](<../pages/reports/Reporting Page - SlaPerformance.md>) and [Tickets](<../pages/reports/Reporting Page - Tickets.md>) pages (`MONTH_NAMES`, `MonthName`).
- Export builders: [deviceReports excelExport](<../pages/reports/deviceReports/Reporting Device Report - excelExport.md>) and [slaPerformance excelExport](<../pages/reports/slaPerformance/Reporting SLA - excelExport.md>) (`parseUsDate`), [patchManagement pdfExport](<../pages/reports/patchManagement/Reporting Patch Management - pdfExport.md>) and [officeWindows reportRows](<../pages/reports/officeWindows/Reporting Office Windows - reportRows.md>) (`fileDateStamp`), [officeWindows wordExport](<../pages/reports/officeWindows/Reporting Office Windows - wordExport.md>) (`longDate`).
- [DeviceReports](<../pages/reports/Reporting Page - DeviceReports.md>) and [HddTickets](<../pages/reports/Reporting Page - HddTickets.md>) pages (`fileDateStamp`).
- [SavedReportsTable](<../pages/reports/savedReports/Reporting Saved Reports - SavedReportsTable.md>) and [DataSyncSection](<../pages/settings/Reporting Settings - DataSyncSection.md>) (`formatDateTime`).
- [pdf util](<Reporting Util - pdf.md>) (`longDate`).
- [client/src/utils/dates.test.ts](../../../client/src/utils/dates.test.ts).

## Key Behavior

- `reportYears` starts at the tenant's first reporting year and always includes next year so a December report can be prepared ahead. The floor is a required parameter rather than a store read, so this module stays import-free and the caller decides how to follow a late-arriving tenant load: `MonthYearSelect` subscribes to the store and passes the value in.
- The floor is clamped to next year, so a `tenant.json` whose `firstReportYear` is in the future still produces a one-entry list rather than an empty picker.
- `fileDateStamp` is not zero-padded (`1-5-26`, not `01-05-26`), so filenames do not sort chronologically as strings; it matters because saved reports de-duplicate on the exact filename.
- `parseUsDate` builds the date with the local-time constructor, so a date-only value stays on the intended calendar day in the user's zone.
- `parseUsDate` is used by the Excel exports to write real date cells instead of strings, so Excel can sort and filter them.
- `formatDateTime` returns the input unchanged when `Date` cannot parse it, which surfaces a bad server timestamp on screen rather than hiding it.
- `reportYears`, `fileDateStamp` and `longDate` take an optional `now` so tests can pin the date; for `reportYears` it is the second argument.

## Cleanup Notes

- The `Number.isNaN(d.getTime())` guard in `parseUsDate` cannot fire: the `Date(y, m, d)` constructor rolls out-of-range components over (`13/01/2026` becomes 1 January 2027) rather than producing an invalid date, so the regex is the only validation that actually applies.

## Source

[client/src/utils/dates.ts](../../../client/src/utils/dates.ts)
