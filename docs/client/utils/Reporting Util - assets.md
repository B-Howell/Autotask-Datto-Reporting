# assets util

> Fetches a static file (the report icons under `/public`, or the tenant logo) as bytes for embedding in exports, treating a missing file as "no icon" rather than an error.

## Purpose

`client/src/utils/assets.ts` serves the report image loader, which embeds the Office and Windows product icons and the agency logo in the Word and PDF exports; the on-screen tables show the same icon files. The design decision is that an asset failure is swallowed: an export must never fail because an icon is missing, so the fetch resolves `null` on any error and the loader skips the image.

## Interface

| Export | Signature | Description |
|---|---|---|
| `fetchAssetBytes` | `(url) => Promise<ArrayBuffer \| null>` | GET the file; `null` on non-2xx or network error. |
| `OFFICE_ICON` | `'/Office.png'` | Path of the Office product icon. |
| `WINDOWS_ICON` | `'/Windows.png'` | Path of the Windows icon. |

## Uses

- `fetch`.

## Used By

- [reportImages util](<Reporting Util - reportImages.md>) (`fetchAssetBytes`, both icon paths) in `loadBrowserAssets`, which is the only caller of the fetch. The export builders themselves take images as input and never import this module.
- [OfficeTable](<../pages/reports/officeWindows/Reporting Office Windows - OfficeTable.md>) and [WindowsTable](<../pages/reports/officeWindows/Reporting Office Windows - WindowsTable.md>) pass the icon paths to their section heading, which renders them as an `img`.

## Key Behavior

- These fetches use the default cache mode, unlike api calls, so the browser may serve the icon from its HTTP cache.
- The icon files live in `client/public/` and are copied to the root of `dist/` by Vite, which is why the paths have no `/assets/` prefix and are not cached long-term by nginx.
- `fetchAssetBytes` accepts no abort signal; icon fetches are small and happen inside an export, not a tracked job.
- Data URLs are no longer produced here. The reportImages util encodes the bytes itself, which works without `FileReader` and therefore under Node.

## Cleanup Notes

- None noted.

## Source

[client/src/utils/assets.ts](../../../client/src/utils/assets.ts)
