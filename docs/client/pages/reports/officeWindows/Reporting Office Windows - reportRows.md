# Office and Windows report rows

> The report identity (type, title, filename) and the function that turns the on-screen tables plus the typed licence figures into the rows both exports print.

## Purpose

The on-screen tables and the two export formats must show the same data, but the exports fold the hand-entered figures into each row and drop subscription lines nobody has put a figure against, so a customer never sees a plan they do not hold. This module is that single translation step, shared by the Word and PDF builders, and it also owns the strings that name the report. It sits in the page layer as a pure helper with no React.

## Interface

| Export | Description |
|---|---|
| `REPORT_TYPE` | `'office_windows'`, the key used for manual inputs and saved-report metadata. |
| `reportTitle(agencyName)` | `<agency> Office and Windows Installs`. |
| `reportFilename(agencyName, 'docx' or 'pdf')` | Title plus a space, the `M-D-YY` date stamp and the extension. |
| `installedOnly(items)` | Filters `InstallBreakdownItem[]` to rows with installs greater than zero. |
| `buildReportRows(sources)` | Produces `{ officeRows: OfficeReportRow[], osRows: OsReportRow[] }` from the bundled Office rows, the OS rows and the three manual-input maps. |
| `ReportRow` | The common shape (`name`, `installs: string or number`, `isGroup?`, `isChild?`, `license`, `available?`) the Word and PDF table builders accept for either table. |

## Uses

- `fileDateStamp` from [dates util](<../../../utils/Reporting Util - dates.md>).
- `BundledOfficeRow` type from [skus](<Reporting Office Windows - skus.md>); `InstallBreakdownItem`, `ManualInputs` from [API types](<../../../api/Reporting API - types.md>).

## Used By

- [OfficeWindowsReports page](<../Reporting Page - OfficeWindowsReports.md>) (`installedOnly`, `reportTitle`).
- [useOfficeWindowsExports](<Reporting Office Windows - useOfficeWindowsExports.md>) (`REPORT_TYPE`, `buildReportRows`, `reportFilename`).
- [useManualInputs](<Reporting Office Windows - useManualInputs.md>) (`REPORT_TYPE`).
- [wordExport](<Reporting Office Windows - wordExport.md>) and [pdfExport](<Reporting Office Windows - pdfExport.md>) (`reportTitle`, `reportFilename`, `ReportRow`).

## Key Behavior

- Office rows: `installs` is the stringified count for group and standalone rows and the empty string for child rows, because installs belong to the family, not to a subscription. `license` is empty for the group row and otherwise read from `officeLicenses[item.key]`. `available` is read from `officeAvailable[item.key]` for child rows only.
- Filtering: a child row survives only if its licence or available text is non-blank after `trim()`. Group and standalone rows are always kept, so an Office 365 heading with no figured subscriptions still prints with its install total and no lines beneath.
- OS rows keep the numeric install count and read `osLicenses[item.name]`; nothing is filtered here because the page already applied `installedOnly`.
- `installedOnly` treats a missing or falsy `installs` as zero, which is why "Windows 10" disappears from both the screen and the exports when its count is 0.
- Manual-input maps are looked up with a fallback to the empty string, so a missing key is indistinguishable from an empty field.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/officeWindows/reportRows.ts](../../../../../client/src/pages/reports/officeWindows/reportRows.ts)
