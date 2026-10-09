# chartCapture

> Rasterises the on-screen donut SVG to a PNG data URL so jsPDF can embed it in the patch report.

## Purpose

jsPDF cannot draw SVG directly and the donut is rendered by MUI X Charts as an SVG in the DOM. Rather than redraw the chart with PDF primitives, the export clones the live SVG, serialises it, paints it onto a canvas and reads back a PNG. This keeps the PDF chart identical to what the user saw. It is a browser-only utility in the page layer with no React dependency.

## Interface

- `captureSvgAsPng(container: HTMLElement or null, scale = 2): Promise<ChartPng or null>`.
- `ChartPng`: `{ dataUrl: string; width: number; height: number }`, where width and height are CSS pixels of the source SVG, not the canvas size.

## Uses

- Browser APIs only: `cloneNode`, `XMLSerializer`, `Image`, `canvas`, `getBoundingClientRect`.

## Used By

- [PatchManagement page](<../Reporting Page - PatchManagement.md>), which calls it with `chartRef.current` before `buildPatchPdf`.
- [pdfExport](<Reporting Patch Management - pdfExport.md>) imports the `ChartPng` type.

## Key Behavior

- Resolves `null` (never rejects) when the container is null, contains no `svg`, the 2D context is unavailable, or the image fails to load. The PDF builder treats `null` as "draw the legend without a chart".
- The first `svg` inside the container is used, which is the donut's own element; the HTML overlay holding the total is not an SVG child and is therefore not captured.
- The clone gets explicit `width` and `height` attributes from the live element's bounding rectangle (falling back to 320 when the rect is zero, for example if the element is hidden) and an explicit `xmlns`, which browsers require before an SVG string can be loaded as an image.
- The SVG is encoded as a `data:image/svg+xml;charset=utf-8` URL with `encodeURIComponent`; no external stylesheet is inlined, so only inline attributes and styles survive the round trip.
- The canvas is `scale` times the CSS size (2x by default) and the context is scaled to match, so the PNG is sharp when the PDF places it at 150pt high.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/patchManagement/chartCapture.ts](../../../../../client/src/pages/reports/patchManagement/chartCapture.ts)
