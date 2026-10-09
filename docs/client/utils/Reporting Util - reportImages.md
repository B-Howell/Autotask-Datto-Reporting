# reportImages util

> The image shape every export builder accepts (bytes, data URL, pixel size) plus the browser loader that fills it from the static icons and the tenant logo.

## Purpose

`client/src/utils/reportImages.ts` separates "get the picture" from "draw the picture". The Word and PDF builders embed the Office and Windows icons and an optional agency logo, and the `docx` library needs pixel dimensions while jsPDF wants a data URL. Rather than each builder fetching, measuring and encoding on its own, a caller resolves every image up front into a `ReportImage` and passes the set in as `ReportAssets`. The builders then run anywhere the data runs; the browser is one supplier of images, and a server-side scheduler can be another.

Dimensions are read straight from the PNG header rather than by loading the file into an `Image`, so measuring works without a DOM.

## Interface

| Export | Signature | Description |
|---|---|---|
| `ReportImage` | interface | `bytes: ArrayBuffer`, `dataUrl: string`, `width`, `height` (pixels), `format: 'PNG' \| 'JPEG'`. |
| `ReportAssets` | interface | `officeIcon?`, `windowsIcon?`, `logo?`, each `ReportImage \| null`. Every field is optional; a missing image is skipped by the builder. |
| `pngDimensions` | `(bytes: ArrayBuffer) => { width, height } \| null` | Reads the IHDR width and height; `null` when the signature does not match or the buffer is shorter than 24 bytes. |
| `toDataUrl` | `(bytes: ArrayBuffer, mime: string) => string` | `data:<mime>;base64,...` built with `btoa`. |
| `pngImage` | `(bytes: ArrayBuffer \| null) => ReportImage \| null` | A `ReportImage` with `format: 'PNG'`; `null` for a null buffer or non-PNG bytes. |
| `loadBrowserAssets` | `(agencyName: string \| null) => Promise<ReportAssets>` | Fetches both icons and, when the tenant maps one, the agency logo, all in parallel, through `fetchAssetBytes`. |

## Uses

- [assets util](<Reporting Util - assets.md>) for `fetchAssetBytes`, `OFFICE_ICON` and `WINDOWS_ICON`.
- [agencyLogos util](<Reporting Util - agencyLogos.md>) for `getAgencyLogoUrl`.
- `DataView`, `Uint8Array` and `btoa`, all available in browsers and in Node.

## Used By

- Export callers that need images in the browser: [useOfficeWindowsExports](<../pages/reports/officeWindows/Reporting Office Windows - useOfficeWindowsExports.md>) and the [PatchManagement page](<../pages/reports/Reporting Page - PatchManagement.md>) call `loadBrowserAssets`.
- Export builders that embed them: [Office Windows wordExport](<../pages/reports/officeWindows/Reporting Office Windows - wordExport.md>), [Office Windows pdfExport](<../pages/reports/officeWindows/Reporting Office Windows - pdfExport.md>) and [Patch Management pdfExport](<../pages/reports/patchManagement/Reporting Patch Management - pdfExport.md>) take `ReportAssets`; [pdf util](<Reporting Util - pdf.md>) `drawReportHeader` takes a `ReportImage`.

## Key Behavior

- `pngDimensions` checks the eight-byte PNG signature and then reads two big-endian 32-bit integers at offsets 16 and 20, which is where the IHDR chunk places width and height in every valid PNG. Nothing else in the file is parsed.
- `pngImage` is the only constructor, so every `ReportImage` built here is a PNG with dimensions that match its bytes. A logo saved as JPEG or SVG under a `.png` name yields `null` and the report renders without it, which is the same degradation a failed fetch produces.
- `loadBrowserAssets` never rejects: `fetchAssetBytes` resolves `null` on any failure and `pngImage(null)` is `null`.
- `toDataUrl` concatenates one character per byte before calling `btoa`. Report images are small icons and a logo of at most a few hundred kilobytes, so this is fast enough and avoids a `FileReader`, which Node does not have.
- A null `agencyName` skips the logo lookup entirely.

## Cleanup Notes

- None noted.

## Source

[client/src/utils/reportImages.ts](../../../client/src/utils/reportImages.ts)
