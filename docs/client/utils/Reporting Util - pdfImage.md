# pdfImage util

> Loads an image, scales it down on a canvas over a solid background and re-encodes it as JPEG so jsPDF embeds it compactly.

## Purpose

`client/src/utils/pdfImage.ts` exists because of one jsPDF behaviour: a PNG with an alpha channel can be stored as raw uncompressed pixels, turning a small logo into megabytes of PDF. Drawing the image onto a canvas filled with white (or another background) and exporting `image/jpeg` removes the alpha channel and produces a compressed stream, and scaling it to a sensible height at the same time keeps the PDF small regardless of the source resolution.

## Interface

| Export | Signature | Description |
|---|---|---|
| `loadCompressedImage` | `(url, { maxHeightPx = 120, quality = 0.85, background = '#ffffff' }) => Promise<CompressedImage \| null>` | Loads, scales, flattens and re-encodes; `null` on load failure or no 2D context. |
| `CompressedImage` | interface | `dataUrl` (JPEG data URL), `width` and `height` (the original natural size), `format: 'JPEG'`. |

`CompressOptions` (`maxHeightPx?`, `quality?`, `background?`) is internal.

## Uses

- The browser `Image`, `canvas` and `CanvasRenderingContext2D`.

## Used By

- [pdf util](<Reporting Util - pdf.md>), in `drawReportHeader`, for the agency logo. It is the only caller.

## Key Behavior

- Scale is `min(1, maxHeightPx / naturalHeight)`, so images shorter than the limit are not upscaled; width and height are rounded and clamped to at least 1 px.
- `width` and `height` in the result are the original natural dimensions, not the canvas size. Callers use them only for the aspect ratio; the PDF draw size is chosen separately.
- `img.crossOrigin = 'anonymous'` is set so that a logo served from another origin with CORS headers does not taint the canvas, which would make `toDataURL` throw. Same-origin `/public` files need no CORS.
- Never rejects: `onerror` resolves `null`, and a missing 2D context (headless or restricted environments) also resolves `null`.
- `quality` 0.85 is the trade-off between visible artefacts on flat logo colours and file size.

## Cleanup Notes

- None noted.

## Source

[client/src/utils/pdfImage.ts](../../../client/src/utils/pdfImage.ts)
