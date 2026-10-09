# Office and Windows Word export

> Builds the DOCX version of the Office and Windows report with the `docx` library: logo, title, date, then the Office and Windows tables.

## Purpose

The Word file is the document account managers send to clients, so it is the reference layout that the PDF export copies. This module is a pure builder in the page layer: it takes the agency name, the prepared report rows and the licence-column flag and returns a Blob. Fetching the icons and logo, styling, and the column arithmetic all live here; delivery is handled by [useOfficeWindowsExports](<Reporting Office Windows - useOfficeWindowsExports.md>).

## Interface

- `buildOfficeWindowsDocx({ agencyName, officeRows, osRows, showLicenses }): Promise<Blob>`.
- `OfficeWindowsDocxInput` is the exported input type; rows are `ReportRow[]`.

## Uses

- `docx` (`Document`, `Packer`, `Paragraph`, `TextRun`, `ImageRun`, `Table`, `TableRow`, `TableCell`, `AlignmentType`, `ShadingType`, `WidthType`).
- [agencyLogos util](<../../../utils/Reporting Util - agencyLogos.md>) (`getAgencyLogoUrl`, `loadImageDimensions`).
- [assets util](<../../../utils/Reporting Util - assets.md>) (`OFFICE_ICON`, `WINDOWS_ICON`, `fetchAssetBytes`).
- `longDate` from [dates util](<../../../utils/Reporting Util - dates.md>); `reportTitle` and `ReportRow` from [reportRows](<Reporting Office Windows - reportRows.md>).

## Used By

- [useOfficeWindowsExports](<Reporting Office Windows - useOfficeWindowsExports.md>).

## Key Behavior

- Document layout, one section: optional centred agency logo (height capped at 60pt, width scaled to keep the aspect ratio), the title `<agency> Office and Windows Installs` in the `headerTitle` style (Calibri 16pt bold, centred), today's long date (12pt, centred, 240 twips after), then the "Office" table block and the "Windows Installs" table block. Each block is a title paragraph (14pt PNG icon, two spaces, bold 14pt text, 240 twips before and 120 after), a full-width table, and an empty spacer paragraph.
- Columns: Product and Installs always; Licenses when `showLicenses`; Available only for the Office table when `showLicenses`. Each figure column is 20% wide and the Product column takes the remainder (40%, 60% or 80%). Product cells are left-aligned, every figure column centred, header included.
- Header row: white bold 11pt text on the dark blue `1D4ED8` fill, marked `tableHeader` so Word repeats it on page breaks. Body rows alternate `F8FAFC` and white starting with the shaded fill on the first row. Every cell has 120 twips of padding on all sides.
- Office 365 group rows are bold in the Product and Installs cells only. Child rows are indented by prefixing the name with two spaces, because Word tables have no per-cell indent in this API. `installs` prints through `String(row.installs ?? '')` so child rows are blank.
- The licence and available cells print the stored text verbatim, or an empty string.
- Icons and the logo are fetched in parallel before the document is built. A missing icon drops the image run from the section title; a missing logo drops the logo paragraph. Neither is an error. The logo loads its bytes and its natural dimensions in parallel and is skipped if either fails.
- Fonts are Calibri throughout; sizes in the style table are half-points (32 = 16pt, 24 = 12pt, 22 = 11pt).

## Cleanup Notes

- The comment above `dataRow` says the child indent is an en-space pair, but the source literal is two ordinary ASCII spaces (verified byte-wise); either fix the comment or use U+2002 characters as described.
- `DOC_STYLES` defines `tableTitle`, `tableHeader` and `tableCell` paragraph styles that nothing references; the table cells set their run properties inline instead.

## Source

[client/src/pages/reports/officeWindows/wordExport.ts](../../../../../client/src/pages/reports/officeWindows/wordExport.ts)
