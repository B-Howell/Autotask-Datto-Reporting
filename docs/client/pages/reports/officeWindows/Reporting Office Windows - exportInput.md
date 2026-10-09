# Office Windows exportInput

> Builds the Word and PDF input (agency name, Office rows, Windows rows, licence toggle) from a breakdown and the agency's saved figures, with no React or store dependency.

## Purpose

The Office and Windows documents print two tables derived from the install breakdown and the figures the account manager typed. The page assembled that input from its own state; a headless renderer has only the API's breakdown and the saved `manual_inputs` map. This module takes exactly those two things and produces everything the document builders need apart from the images, so the page and the renderer produce the same tables. It is a pure util in the Office Windows folder.

## Interface

| Export | Description |
|---|---|
| `InstallBreakdowns` | `Pick<OfficeWindowsBreakdown, 'windows_installs' or 'office_installs'>`: the API response, or a group's merged lists. |
| `OfficeWindowsExportInput` | `ReportRows` plus `agencyName` and `showLicenses`; the `assets` field of the builders' input is added by the caller. |
| `officeWindowsExportInput(breakdown, manualInputs, agencyName, showLicenses)` | The export input. |

`manualInputs` is the flat map the server stores per agency and report type: licence counts under the product name, Available counts under `available::<product>`, the visible plan list as JSON under `VISIBLE_SKUS_KEY`.

## Uses

- [reportRows](<Reporting Office Windows - reportRows.md>) for `buildReportRows`, `installedOnly`, `ReportRows`.
- [skus](<Reporting Office Windows - skus.md>) for `groupOfficeInstalls`, `availableValuesOf`, `visibleSkusOf`.
- `ManualInputs`, `OfficeWindowsBreakdown` types from [API types](<../../../api/Reporting API - types.md>).

## Used By

- [useOfficeWindowsExports](<Reporting Office Windows - useOfficeWindowsExports.md>), which spreads the result with the loaded `assets` and hands it to both document builders.
- [client/src/pages/reports/officeWindows/exportInput.test.ts](../../../../../client/src/pages/reports/officeWindows/exportInput.test.ts).

## Key Behavior

- Office rows are `groupOfficeInstalls(office_installs, visibleSkusOf(manualInputs))`: Microsoft 365 variants fold under one Office 365 family row followed by the agency's visible plan lines, perpetual editions stay as their own rows. `buildReportRows` then drops any plan line without a licence or Available figure, so a customer never sees a plan they do not hold.
- Windows rows are `installedOnly(windows_installs)`, so a version with zero installs is omitted.
- The same map serves as both the Office and the Windows licence source, as it does on screen; product names of the two kinds never collide.
- `showLicenses` is passed through untouched; the builders use it to drop the Licenses and Available columns.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/officeWindows/exportInput.ts](../../../../../client/src/pages/reports/officeWindows/exportInput.ts)
