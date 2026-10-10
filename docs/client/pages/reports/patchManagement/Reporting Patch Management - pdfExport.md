# Patch Management PDF export

> Builds the patch report PDF (header, summary label, donut image, legend, device table) and uploads it to Saved Reports.

## Purpose

The patch report is delivered to clients as a PDF only. This module draws the whole document with jsPDF and jspdf-autotable from the store's summary and device list plus the pre-rasterised donut, and separately exposes the upload step so the page can download, save, or both. Both functions are pure with respect to React; the page supplies everything.

## Interface

- `buildPatchPdf({ agency, summary, devices, total, chart, assets }): Promise<BuiltPdf>` where `chart` is a `ChartPng` or null, `assets` is a `ReportAssets` of which only `logo` is used, and `BuiltPdf` is `{ doc: jsPDF; filename: string }`.
- `savePatchPdf(built, agency): Promise<void>`: uploads the PDF with saved-report metadata; swallows failures because the upload helper has already shown the toast.
- Exported types: `PatchPdfInput`, `BuiltPdf`.

## Uses

- `jspdf` and `jspdf-autotable` via `loadPdfLibraries`, plus `PDF_ACCENT`, `PDF_BAND`, `PDF_MARGIN`, `drawReportHeader`, `hexToRgb` from [pdf util](<../../../utils/Reporting Util - pdf.md>).
- The `ReportAssets` type from [reportImages util](<../../../utils/Reporting Util - reportImages.md>) (type only).
- `saveReportBlob` from [saveReport util](<../../../utils/Reporting Util - saveReport.md>); `fileDateStamp` from [dates util](<../../../utils/Reporting Util - dates.md>).
- `formatReboot` from [formatters](<Reporting Patch Management - formatters.md>); `STATUS_COLORS` from [statusColors](<Reporting Patch Management - statusColors.md>); `ChartPng` from [chartCapture](<Reporting Patch Management - chartCapture.md>).
- `isAgencyGroup` and the `EffectiveAgency`, `PatchDevice`, `PatchSummaryItem` types from [API types](<../../../api/Reporting API - types.md>).

## Used By

- [PatchManagement page](<../Reporting Page - PatchManagement.md>): Export to PDF calls `doc.save(filename)` then `savePatchPdf`; Save to app calls `savePatchPdf` only.

## Key Behavior

- Document: US Letter, points, `compress: true`.
- Layout, top to bottom: the shared report header (the agency logo from `assets.logo` when present, the title `<agency> Patch Management Summary Report`, the long date); the label "PATCH SUMMARY" in 13pt bold accent blue; the donut image at the left margin, 150pt high with width from the capture's aspect ratio, and the total redrawn in 26pt bold at the image centre (the on-screen total is an HTML overlay, so the capture lacks it); the legend starting 190pt right of the margin, one 11pt line per summary entry at 18pt spacing with a 10pt colour square, `<label>:` in grey and the count in bold accent blue; then the device table 20pt below whichever is lower, the chart bottom or the last legend line.
- When `chart` is null the donut and the total are skipped and the legend alone follows the label.
- Device table columns: Device Name, Description, Last User, Last Reboot, Installed, Approved Pending, Not Approved, Patch Status. The three count columns are centred; `last_user` falls back to an empty string; the reboot is formatted with `formatReboot`; the status column prints `status_label`, with no colour.
- Table styling: `theme: 'grid'`, Helvetica 9pt, 4pt cell padding, accent-blue header with white bold centred text, body text near-black, banded with `PDF_BAND`, margins at `PDF_MARGIN`. Autotable paginates long device lists itself.
- Filename: `<agency> Patch Management Summary <M-D-YY>.pdf`.
- Saved-report metadata: `reportType: 'patch'`, `format: 'pdf'`, `agencyId` is the agency id for a single company and the empty string for a group; the title is left to `saveReportBlob`, which uses the filename without `.pdf`.

## Cleanup Notes

- The page downloads with `doc.save` and then calls `savePatchPdf`, which reimplements what `deliverBlob` in the saveReport util does for the other reports; it could call `deliverBlob` and drop `savePatchPdf`.

## Source

[client/src/pages/reports/patchManagement/pdfExport.ts](../../../../../client/src/pages/reports/patchManagement/pdfExport.ts)
