# PatchSummaryCard

> The "Patch Summary" card: the status donut with the device total in its hole and the colour legend beside it.

## Purpose

The first thing a reader wants from the patch report is the split of workstations by patch status. This card composes the shared `DonutChart` and `ChartLegend` into one `Paper` and exposes a ref to the donut wrapper so the page can rasterise the SVG for the PDF. It is a presentational component in the page layer; the slices and total are computed by the page from the store's summary.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `slices` | `DonutSlice[]` | yes | One slice per patch status: `{ id, label, value, color }`. |
| `total` | `number` | yes | Shown in the donut hole; the page sums the slice counts. |
| `chartRef` | `Ref<HTMLDivElement>` | no | Receives the donut wrapper element for `captureSvgAsPng`. |

## Uses

- `@mui/material` (`Paper`, `Box`, `Typography`).
- [DonutChart and ChartLegend](<../../../components/report/Reporting Report Component - DonutChart.md>) and the `DonutSlice` type.

## Used By

- [PatchManagement page](<../Reporting Page - PatchManagement.md>), which builds the slices from `summary` with [statusColors](<Reporting Patch Management - statusColors.md>) and passes the ref it later hands to [chartCapture](<Reporting Patch Management - chartCapture.md>).

## Key Behavior

- The heading is the overline "Patch Summary" (bold, letter-spaced); the content row is a centred, wrapping flex box with a wide gap, so on narrow screens the legend drops under the donut.
- Slices are passed through unchanged; `DonutChart` itself drops zero-value slices from the pie while the legend still lists every status, including zero counts.
- The total in the hole is an HTML overlay rendered by `DonutChart`, not part of the SVG. This is why the PDF export redraws the number over the captured image.
- The ref is forwarded straight to `DonutChart`, whose wrapper `Box` carries it; the PDF capture queries the first `svg` inside that element.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/patchManagement/PatchSummaryCard.tsx](../../../../../client/src/pages/reports/patchManagement/PatchSummaryCard.tsx)
