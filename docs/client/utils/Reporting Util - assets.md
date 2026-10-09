# assets util

> Fetches static files from `/public` as bytes or data URLs for embedding in exports, treating a missing file as "no icon" rather than an error.

## Purpose

`client/src/utils/assets.ts` serves the Office/Windows exports, which embed the Office and Windows product icons in the Word document (bytes) and the PDF (data URL), and show the same icons in the on-screen tables. The design decision is that an asset failure is swallowed: an export must never fail because an icon is missing, so both functions resolve `null` on any error and the caller skips the image.

## Interface

| Export | Signature | Description |
|---|---|---|
| `fetchAssetBytes` | `(url) => Promise<ArrayBuffer \| null>` | GET the file; `null` on non-2xx or network error. |
| `fetchAssetDataUrl` | `(url) => Promise<string \| null>` | GET the file and encode it as a `data:` URL with `FileReader`; `null` on any failure. |
| `OFFICE_ICON` | `'/Office.png'` | Path of the Office product icon. |
| `WINDOWS_ICON` | `'/Windows.png'` | Path of the Windows icon. |

## Uses

- The browser `fetch` and `FileReader`.

## Used By

- [Office Windows wordExport](<../pages/reports/officeWindows/Reporting Office Windows - wordExport.md>) (`fetchAssetBytes`, both icon paths).
- [Office Windows pdfExport](<../pages/reports/officeWindows/Reporting Office Windows - pdfExport.md>) (`fetchAssetDataUrl`, both icon paths).
- [reportImages util](<Reporting Util - reportImages.md>) (`fetchAssetBytes`, both icon paths) in `loadBrowserAssets`.
- [OfficeTable](<../pages/reports/officeWindows/Reporting Office Windows - OfficeTable.md>) and [WindowsTable](<../pages/reports/officeWindows/Reporting Office Windows - WindowsTable.md>) pass the icon paths to their section heading, which renders them as an `img`.

## Key Behavior

- These fetches use the default cache mode, unlike api calls, so the browser may serve the icon from its HTTP cache.
- `fetchAssetDataUrl` resolves `null` if `FileReader.result` is not a string, which only happens on a reader error; `onloadend` fires after `onerror`, so the first resolve wins.
- The icon files live in `client/public/` and are copied to the root of `dist/` by Vite, which is why the paths have no `/assets/` prefix and are not cached long-term by nginx.
- Neither function accepts an abort signal; icon fetches are small and happen inside an export, not a tracked job.

## Cleanup Notes

- None noted.

## Source

[client/src/utils/assets.ts](../../../client/src/utils/assets.ts)
