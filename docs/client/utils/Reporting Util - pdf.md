# pdf util

> The shared jsPDF loader, page constants and report header (logo, title, date) used by every PDF export.

## Purpose

`client/src/utils/pdf.ts` sits under the two PDF builders (patch management and Office/Windows). It loads jsPDF and the autotable plugin on demand so neither is in the initial bundle, fixes the margin and the accent colours so PDFs match the Excel exports, and draws the standard header: a centred agency logo when the caller supplies one, a centred bold title that shrinks and wraps rather than overflowing, and today's date in long form. It returns the y position where the body should start.

## Interface

| Export | Signature | Description |
|---|---|---|
| `PDF_MARGIN` | `40` | Page margin in points. |
| `PDF_ACCENT` | `[29, 78, 216]` | Header blue, the RGB form of the Excel `XLSX_HEADER_FILL`. |
| `PDF_BAND` | `[248, 250, 252]` | Alternate row fill, matching `XLSX_ROW_EVEN`. |
| `loadPdfLibraries` | `() => Promise<{ JsPDF, autoTable }>` | Parallel dynamic imports of `jspdf` and `jspdf-autotable`. |
| `drawReportHeader` | `(doc, title, logo: ReportImage \| null) => number` | Draws the logo when given, then the title and date; returns the content start y. |
| `hexToRgb` | `(hex) => [r, g, b]` | `#rrggbb` to a tuple for jsPDF fill calls. |
| `lastTableBottom` | `(doc) => number` | `doc.lastAutoTable.finalY`, or 0 if no table has been drawn. |

## Uses

- `jspdf` (type only at module level, code inside `loadPdfLibraries`), `jspdf-autotable`.
- [dates util](<Reporting Util - dates.md>) for `longDate`.
- [reportImages util](<Reporting Util - reportImages.md>) for the `ReportImage` type (type only).

## Used By

- [patchManagement pdfExport](<../pages/reports/patchManagement/Reporting Patch Management - pdfExport.md>).
- [officeWindows pdfExport](<../pages/reports/officeWindows/Reporting Office Windows - pdfExport.md>).

## Key Behavior

- Logo: when a `ReportImage` is passed, `logo.dataUrl` is drawn in `logo.format` at most 50 pt high with width scaled from `logo.width` and `logo.height` to keep the aspect ratio, centred, using the `FAST` compression hint, and the title moves down by the drawn height plus 14 pt. `null` adds no vertical space. The caller decides where the image comes from (the browser loader in the reportImages util, or bytes read from disk on a server), so this function does no fetching of its own.
- Title: starts at 18 pt bold Helvetica and steps down one point at a time (to a floor of 12 pt) while the single-line width exceeds twice the usable width, then `splitTextToSize` wraps whatever remains. Each line advances `fontSize * 1.2`.
- Date: 13 pt normal, drawn 2 pt below the last title line. The returned y is that baseline plus 30.
- `lastTableBottom` reads a property the autotable plugin attaches to the document; it is typed through a cast because the plugin does not declare it on `jsPDF`.
- `hexToRgb` does not validate; a short `#abc` form would yield `NaN` components. Callers pass the six-digit constants from the status colour table.
- The function is synchronous: with the image supplied up front there is nothing to await. jsPDF deflates a transparent PNG's pixels and alpha mask itself under the `FAST` hint (a 1200 by 400 transparent logo adds about 12 KB), so the canvas flattening to JPEG that the header used to do is not needed.

## Cleanup Notes

- None noted.

## Source

[client/src/utils/pdf.ts](../../../client/src/utils/pdf.ts)
