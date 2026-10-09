# Patch status colours

> The colour assigned to each Datto patch status, shared by the donut, the legend, the table dots and the PDF.

## Purpose

The patch status colours appear in four places (donut slices, legend swatches, the dot in each table row and the PDF legend), and they must agree so a reader can match a slice to a row. This module is the single mapping, keyed by the server's `PatchStatus` union so adding a status on the server without a colour here is a type error. Constants only.

## Interface

- `STATUS_COLORS: Record<PatchStatus, string>`, hex strings:

| Status | Colour |
|---|---|
| `FullyPatched` | `#2e7d32` (green) |
| `ApprovedPending` | `#81c784` (light green) |
| `InstallError` | `#f9a825` (amber) |
| `RebootRequired` | `#e53935` (red) |
| `NoData` | `#8b1a1a` (dark red) |
| `NoPolicy` | `#bdbdbd` (grey) |

## Uses

- `PatchStatus` type from [API types](<../../../api/Reporting API - types.md>).

## Used By

- [PatchManagement page](<../Reporting Page - PatchManagement.md>) (donut slices).
- [WorkstationTable](<Reporting Patch Management - WorkstationTable.md>) (status dot).
- [pdfExport](<Reporting Patch Management - pdfExport.md>) (legend swatches, converted with `hexToRgb`).

## Key Behavior

- The palette follows the vendor's sample report rather than the app theme, so it is the same in light and dark mode.
- Status order (for the donut and legend) is not defined here; it comes from `PATCH_STATUS_ORDER` in the data hook, which mirrors the server's label table.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/patchManagement/statusColors.ts](../../../../../client/src/pages/reports/patchManagement/statusColors.ts)
