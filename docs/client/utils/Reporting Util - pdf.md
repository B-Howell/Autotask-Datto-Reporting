# pdf util

> The shared jsPDF loader, page constants and report header (logo, title, date) used by every PDF export.

## Purpose

`client/src/utils/pdf.ts` sits under the two PDF builders (patch management and Office/Windows). It loads jsPDF and the autotable plugin on demand so neither is in the initial bundle, fixes the margin and the accent colours so PDFs match the Excel exports, and draws the standard header: a centred agency logo when one is configured, a centred bold title that shrinks and wraps rather than overflowing, and today's date in long form. It returns the y position where the body should start.

## Interface

| Export | Signature | Description |
|---|---|---|
| `PDF_MARGIN` | `40` | Page margin in points. |
| `PDF_ACCENT` | `[29, 78, 216]` | Header blue, the RGB form of the Excel `XLSX_HEADER_FILL`. |
| `PDF_BAND` | `[248, 250, 252]` | Alternate row fill, matching `XLSX_ROW_EVEN`. |
| `loadPdfLibraries` | `() => Promise<{ JsPDF, autoTable }>` | Parallel dynamic imports of `jspdf` and `jspdf-autotable`. |
| `drawReportHeader` | `(doc, agencyName, title) => Promise<number>` | Draws logo, title and date; resolves the content start y. |
| `hexToRgb` | `(hex) => [r, g, b]` | `#rrggbb` to a tuple for jsPDF fill calls. |
| `lastTableBottom` | `(doc) => number` | `doc.lastAutoTable.finalY`, or 0 if no table has been drawn. |

## Uses

- `jspdf` (type only at module level, code inside `loadPdfLibraries`), `jspdf-autotable`.
- [agencyLogos util](<Reporting Util - agencyLogos.md>) for `getAgencyLogoUrl`.
- [dates util](<Reporting Util - dates.md>) for `longDate`.
- [pdfImage util](<Reporting Util - pdfImage.md>) for `loadCompressedImage`.

## Used By

- [patchManagement pdfExport](<../pages/reports/patchManagement/Reporting Patch Management - pdfExport.md>).
- [officeWindows pdfExport](<../pages/reports/officeWindows/Reporting Office Windows - pdfExport.md>).

## Key Behavior

- Logo: fetched through `loadCompressedImage` at up to 120 px tall and re-encoded as JPEG, then drawn at most 50 pt high with width scaled to keep the aspect ratio, centred, using the `FAST` compression hint. A missing or failed logo adds no vertical space.
- Title: starts at 18 pt bold Helvetica and steps down one point at a time (to a floor of 12 pt) while the single-line width exceeds twice the usable width, then `splitTextToSize` wraps whatever remains. Each line advances `fontSize * 1.2`.
- Date: 13 pt normal, drawn 2 pt below the last title line. The returned y is that baseline plus 30.
- `lastTableBottom` reads a property the autotable plugin attaches to the document; it is typed through a cast because the plugin does not declare it on `jsPDF`.
- `hexToRgb` does not validate; a short `#abc` form would yield `NaN` components. Callers pass the six-digit constants from the status colour table.
- The whole header is async only because of the logo load; the text drawing is synchronous.

## Cleanup Notes

- None noted.

## Source

[client/src/utils/pdf.ts](../../../client/src/utils/pdf.ts)
