# ReportHeading

> The centred report title and the "Licenses" switch that shows or hides the licence columns on the Office and Windows report.

## Purpose

The report is used two ways: as an internal worksheet where licence figures are typed in, and as a customer-facing document where the licence columns may be unwanted. The switch rendered here controls both the on-screen tables and the exported documents, because the page passes the same `showLicenses` flag to the tables and to the export hook. The component is presentational; the page owns the flag.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | yes | The report title, built by `reportTitle(agencyName)` in the page. |
| `showLicenses` | `boolean` | yes | Current state of the switch. |
| `onShowLicensesChange` | `(show: boolean) => void` | yes | Called with the new checked state. |

## Uses

- `@mui/material` (`Typography`, `Box`, `FormControlLabel`, `Switch`).

## Used By

- [OfficeWindowsReports page](<../Reporting Page - OfficeWindowsReports.md>).

## Key Behavior

- The title is an `h6` centred with `mb: 2`; the switch sits in a centred flex row with `mb: 3`, so this component also sets the gap above the first table.
- The switch label is the single word "Licenses". The page initialises the flag to `true`, so licence columns are visible by default after a report is generated.
- Toggling the switch does not clear any typed figures; it only hides the columns, and the figures reappear when it is switched back on.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/officeWindows/ReportHeading.tsx](../../../../../client/src/pages/reports/officeWindows/ReportHeading.tsx)
