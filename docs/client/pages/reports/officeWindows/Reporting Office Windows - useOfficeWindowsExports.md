# useOfficeWindowsExports

> The Word and PDF export actions for the Office and Windows report; every export also keeps a copy under Saved Reports.

## Purpose

The page has three export-shaped buttons (Export to Word, Export to PDF, Save to app) that all start from the same on-screen rows and typed figures. This hook hands the breakdown and the saved figures to `officeWindowsExportInput`, loads the icons and logo the builders will embed, names the files, and hands the result to `deliverBlob`, which downloads and uploads. It is a thin page-level hook with no state of its own.

## Interface

Input (`ExportSources`): `agencyName: string or null`, `showLicenses: boolean`, `breakdown: InstallBreakdowns` (`windows_installs`, `office_installs`) and `manualInputs: ManualInputs`, the agency's saved map.

Returns:

| Member | Description |
|---|---|
| `exportToWord(save: boolean)` | Builds the DOCX. `save=false` downloads and uploads; `save=true` uploads only (the "Save to app" button). |
| `exportToPdf()` | Builds the PDF, downloads it and uploads it. |

## Uses

- `loadBrowserAssets` from [reportImages util](<../../../utils/Reporting Util - reportImages.md>).
- `deliverBlob` from [saveReport util](<../../../utils/Reporting Util - saveReport.md>).
- [wordExport](<Reporting Office Windows - wordExport.md>) (`buildOfficeWindowsDocx`) and [pdfExport](<Reporting Office Windows - pdfExport.md>) (`buildOfficeWindowsPdf`).
- [exportInput](<Reporting Office Windows - exportInput.md>) (`officeWindowsExportInput`, `InstallBreakdowns`).
- [reportRows](<Reporting Office Windows - reportRows.md>) (`REPORT_TYPE`, `reportFilename`).

## Used By

- [OfficeWindowsReports page](<../Reporting Page - OfficeWindowsReports.md>), wired to `ReportActions` as two export entries and the `onSave` handler.

## Key Behavior

- Both actions return immediately when `agencyName` is null, which is the case until a report has been generated; the page also hides the buttons through `hasResults`.
- `input` is async because it calls `loadBrowserAssets` for every export, so the icons and logo are fetched here and the builders do no fetching of their own.
- `officeWindowsExportInput` runs at export time, not on render, so the document reflects the figures as they stand when the button is clicked, including the rule that drops subscription lines with no figure.
- Saved-report metadata is `{ agencyName, reportType: 'office_windows', format }`; the title is left to `saveReportBlob`, which uses the filename with its extension removed. No `agencyId` is passed, so Saved Reports index these by name only.
- Filenames come from `reportFilename`: `<agency> Office and Windows Installs <M-D-YY>.docx` or `.pdf`. The PDF builder returns its own filename, which is the same function applied with `'pdf'`.
- The PDF blob is produced with `doc.output('blob')`; the DOCX builder already returns a Blob.
- There is no save-only PDF path: "Save to app" always produces the Word document.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/officeWindows/useOfficeWindowsExports.ts](../../../../../client/src/pages/reports/officeWindows/useOfficeWindowsExports.ts)
