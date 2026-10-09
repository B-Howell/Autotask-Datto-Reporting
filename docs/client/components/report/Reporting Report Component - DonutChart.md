# DonutChart

> Donut chart with a figure in the hole, plus a matching `ChartLegend`; the ref exposes the wrapper so the SVG can be captured for PDF export.

## Purpose

The patch management report shows status counts as a donut with the device total in the middle and a legend beside it, and the same drawing has to go into the PDF. This component wraps MUI X `PieChart` with the geometry fixed and forwards a ref to the wrapper so `chartCapture` can serialise the SVG. It is in the report component layer.

## Interface

`DonutChart` (default export, `forwardRef<HTMLDivElement>`):

| Prop | Type | Required | Description |
|---|---|---|---|
| `slices` | `DonutSlice[]` | yes | `{ id, label, value, color }` per status. |
| `centre` | `ReactNode` | yes | Figure shown in the hole, usually the total. |
| `size` | `number` | no | Width and height in px. Default 260. |

`ChartLegend` (named export): `slices: DonutSlice[]`, renders one swatch and `label: value` line per slice. Exports the `DonutSlice` type.

## Uses

- `react` (`forwardRef`)
- `@mui/material` (`Box`, `Typography`)
- `@mui/x-charts/PieChart`

## Used By

- Re-exported by [the report component barrel](<Reporting Report Component - index.md>)
- [patchManagement PatchSummaryCard](<../../pages/reports/patchManagement/Reporting Patch Management - PatchSummaryCard.md>), which uses both the chart and the legend and passes the ref on to `chartCapture`

## Key Behavior

- Zero-value slices are filtered out of the series so they do not draw hairline wedges, but the legend still lists every slice including zeros.
- Geometry scales with `size`: inner radius 27 percent, outer 46 percent, 1 degree padding, 2 px corner radius, 5 px margins, legend hidden.
- The centre figure is an absolutely positioned `h3` over the chart with `pointerEvents: none`, so hover tooltips on the wedges still work.
- Slice colours come from the caller (`statusColors`), not from the chart's default palette.

## Cleanup Notes

- `type ReactNode = React.ReactNode` is declared after its first use and relies on the global `React` namespace rather than importing the type; it compiles but is out of step with the other files, which import `ReactNode` from `react`.

## Source

[client/src/components/report/DonutChart.tsx](../../../../client/src/components/report/DonutChart.tsx)
