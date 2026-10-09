# Office and Windows PDF export

> Builds the PDF version of the Office and Windows report with jsPDF and jspdf-autotable, matching the Word export section for section.

## Purpose

The Word export is the primary document; this module produces the same report as a PDF for customers who want a fixed-layout file. It is a pure builder in the page layer: given the agency name, the prepared report rows, the licence-column flag and the images to embed, it returns a jsPDF document and the filename. Downloading and saving are done by [useOfficeWindowsExports](<Reporting Office Windows - useOfficeWindowsExports.md>).

## Interface

- `buildOfficeWindowsPdf({ agencyName, officeRows, osRows, showLicenses, assets }): Promise<{ doc: jsPDF; filename: string }>`. `officeRows` and `osRows` are `ReportRow[]` from `buildReportRows`; `assets` is a `ReportAssets`.
- `OfficeWindowsPdfInput` is the exported input type.

## Uses

- `jspdf` and `jspdf-autotable`, loaded lazily through `loadPdfLibraries`.
- [pdf util](<../../../utils/Reporting Util - pdf.md>): `PDF_ACCENT`, `PDF_BAND`, `PDF_MARGIN`, `drawReportHeader`, `lastTableBottom`.
- [reportImages util](<../../../utils/Reporting Util - reportImages.md>): the `ReportAssets` type (type only).
- [reportRows](<Reporting Office Windows - reportRows.md>): `reportTitle`, `reportFilename`, `ReportRow`.

## Used By

- [useOfficeWindowsExports](<Reporting Office Windows - useOfficeWindowsExports.md>).

## Key Behavior

- Document: US Letter, points, `compress: true` so every stream is Flate-compressed.
- Layout, top to bottom: the shared report header (the logo from `assets.logo` when present, the title `<agency> Office and Windows Installs`, today's long date), then the "Office" section, then the "Windows Installs" section. Each section is a 14pt bold Helvetica title with its 16pt PNG icon to the left (icon pulled up 2pt to centre on the baseline, 6pt gap), 8pt of space, then the table. The second title starts 28pt below the bottom of the first table.
- Office table columns: Product, Installs, then Licenses and Available when `showLicenses` is true. Windows table columns: Product, Installs, then Licenses only. The Available column is never drawn for Windows.
- Table styling: `theme: 'grid'`, Helvetica 11pt, 6pt cell padding, header filled with the shared accent blue in white bold text, body text near-black, alternating rows banded with `PDF_BAND`, left and right margins at `PDF_MARGIN`. Column 0 is left-aligned and every other column centred. The header row is left-aligned for all columns.
- Office 365 group rows are bolded through `didParseCell`, matched by row index against `officeRows[i].isGroup`. Child SKU rows have their name prefixed with three spaces because autotable has no per-cell indent.
- `installs` is printed with `String(r.installs ?? '')`, so child rows (whose installs are the empty string) print blank.
- Icons are `assets.officeIcon` and `assets.windowsIcon`, drawn from their `dataUrl`; a missing icon is not an error, the title is simply drawn without it and the text starts at the margin. The builder fetches nothing; only the library load is awaited.
- Filename: `<agency> Office and Windows Installs <M-D-YY>.pdf` from `reportFilename`.

## Cleanup Notes

- No page-fit check before the second section title: it is drawn at `lastTableBottom + 28` regardless of the remaining page height, so a long Office table can push the "Windows Installs" title to the bottom edge while autotable moves the table itself to the next page.

## Source

[client/src/pages/reports/officeWindows/pdfExport.ts](../../../../../client/src/pages/reports/officeWindows/pdfExport.ts)
