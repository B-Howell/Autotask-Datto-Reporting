# renderer assets

> Reads the product icons from `client/public` and decodes an optional base64 logo into the `ReportAssets` the Word and PDF builders embed, replacing the browser's fetch-based loader under Node.

## Purpose

`client/renderer/assets.ts` is the Node counterpart of `loadBrowserAssets` in the [reportImages util](<../utils/Reporting Util - reportImages.md>). The builders take images as bytes plus dimensions and never fetch anything themselves; in the browser those bytes come from `fetch`, and here they come from the filesystem. The Office and Windows icons are the same two PNGs the site serves, read relative to this module so the service works from any working directory. The agency logo is different: the renderer has no tenant settings, so the caller sends the logo bytes as base64 in the request and this module decodes them.

## Interface

| Export | Signature | Description |
|---|---|---|
| `loadRendererAssets` | `(logoBase64?: string \| null) => Promise<ReportAssets>` | `{ officeIcon, windowsIcon, logo }`, each a `ReportImage` or null. |

## Uses

- `node:fs/promises` and `node:url` to locate and read `client/public/Office.png` and `client/public/Windows.png`.
- [reportImages util](<../utils/Reporting Util - reportImages.md>) for `pngImage`, which validates the PNG header and reads the dimensions.

## Used By

- [render](<Reporting Renderer - render.md>), for the `office_windows` and `patch` handlers.

## Key Behavior

- `PUBLIC_DIR` is derived from `import.meta.url`, so the icons resolve to the checked-in files whether the service is started from `client/` or elsewhere.
- Node may hand back a `Buffer` that views a slice of a larger pooled allocation; `toArrayBuffer` copies exactly the viewed bytes so `pngImage` never reads a neighbour's data.
- A missing or unreadable icon yields null rather than a failure, and a logo that is not a PNG yields null from `pngImage`; the builders leave a null image out, so the report still renders, as it does in the browser when a fetch fails.
- The icons are read on every call rather than cached. They are a few kilobytes each and a render is rare, so the simplicity wins.

## Cleanup Notes

- None noted.

## Source

[client/renderer/assets.ts](../../../client/renderer/assets.ts)
