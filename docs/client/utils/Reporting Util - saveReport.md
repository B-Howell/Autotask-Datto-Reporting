# saveReport util

> Delivers a finished export: downloads the blob to the browser, uploads it to Saved Reports, and shows a toast either way.

## Purpose

`client/src/utils/saveReport.ts` is the last step of every export builder. The README's rule is that "Export" downloads the file and also keeps a copy in the app, while "Save to app" uploads only; `deliverBlob` encodes exactly that with a single `save` flag so no page re-implements the choice. The upload goes through `saveReportBlob`, which owns the success and failure toasts so the builders stay free of UI code.

## Interface

| Export | Signature | Description |
|---|---|---|
| `SaveReportArgs` | interface | `SavedReportMeta` plus `blob` and `filename`. |
| `saveReportBlob` | `(args) => Promise<SaveReportResponse>` | Uploads, toasts `<title> saved to app` or `Save failed: <reason>`, rethrows on failure. The title defaults to the file name without its last extension (`Patch Summary 10-9-26.pdf` to `Patch Summary 10-9-26`; a name with no extension is used as is), computed by the module-private `fileStem`. |
| `downloadBlob` | `(blob, filename) => void` | Object URL, hidden anchor click, URL revoked. |
| `DeliverArgs` | interface | `blob`, `filename`, `save?` (default `false`), `meta?`. |
| `deliverBlob` | `(args) => Promise<SaveReportResponse \| null>` | Download unless `save`, then upload; `null` if the upload failed. |

## Uses

- [savedReports api](<../api/Reporting API - savedReports.md>): `uploadSavedReport`, `SavedReportMeta`; [types](<../api/Reporting API - types.md>): `SaveReportResponse`.
- [toastStore](<../store/Reporting Store - toastStore.md>) for `showToast`.
- [reportJob util](<Reporting Util - reportJob.md>) for `errorMessage`.

## Used By

- Pages [AgencyUtilization](<../pages/reports/Reporting Page - AgencyUtilization.md>), [AnnualUtilization](<../pages/reports/Reporting Page - AnnualUtilization.md>), [DeviceReports](<../pages/reports/Reporting Page - DeviceReports.md>), [HddTickets](<../pages/reports/Reporting Page - HddTickets.md>), [SlaPerformance](<../pages/reports/Reporting Page - SlaPerformance.md>) call `deliverBlob`.
- [useOfficeWindowsExports](<../pages/reports/officeWindows/Reporting Office Windows - useOfficeWindowsExports.md>) calls `deliverBlob`.
- [patchManagement pdfExport](<../pages/reports/patchManagement/Reporting Patch Management - pdfExport.md>) calls `saveReportBlob` directly.
- [client/src/utils/saveReport.test.ts](../../../client/src/utils/saveReport.test.ts).

## Key Behavior

- `deliverBlob` downloads first, then uploads, so a failed upload never costs the user the file they asked for.
- The upload failure inside `deliverBlob` is caught and turned into `null`; the user has already seen the error toast from `saveReportBlob`, and the export flow continues.
- `saveReportBlob` rethrows after toasting, so a direct caller (the patch PDF) can still react to failure.
- The toast label is `meta.title` when present, otherwise `fileStem(filename)`, and that same label is sent as the upload's `title` so the Saved Reports list and the toast agree. Every export builder names its file `<something> <M-D-YY>.<ext>` and wants exactly that stem as the title, so none of them passes one; a caller with a different title in mind still can.
- De-duplication is the server's: the same filename on the same day replaces the earlier row, which is why export filenames include the date stamp from the dates util.
- `downloadBlob` revokes the object URL immediately after `click()`; browsers have already started the download by then.
- `downloadBlob` is exported but every current caller goes through `deliverBlob`.

## Cleanup Notes

- `saveReport.test.ts` covers the default title (and through it the stem rule, including a dotted name and one with no extension); `downloadBlob` and `deliverBlob` are exercised only through the pages.

## Source

[client/src/utils/saveReport.ts](../../../client/src/utils/saveReport.ts)
