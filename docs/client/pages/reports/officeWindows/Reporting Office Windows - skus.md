# Office SKU rules

> The Office 365 subscription catalogue, the grouping of detected Microsoft 365 installs under one family row, and the key conventions for the saved manual inputs.

## Purpose

Datto reports Microsoft 365 installs as several product names, but a customer licenses Office 365 as one subscription and an install cannot be attributed to a specific plan. This module encodes that domain rule: Microsoft 365 variants collapse into a single "Office 365" row carrying the total, the plans an agency holds are listed beneath it as licence-only lines, and perpetual editions stay as their own rows. It also defines how the Available figures and the visible-plan choice are namespaced inside the one manual-inputs map the server stores per agency. Pure helpers, no React.

## Interface

| Export | Description |
|---|---|
| `M365_PREFIX` | `'Microsoft 365'`; a detected product starting with this is a variant of the family. |
| `M365_GROUP_LABEL` | `'Office 365'`, the family row's name and key. |
| `M365_DESKTOP_SKUS` | The twelve plans that entitle a desktop install, in canonical display order. Web-only plans (Business Basic, Office 365 E1, Microsoft 365 F3) are deliberately absent. |
| `availableKey(productKey)` | `available::<productKey>`, the saved key for an Available figure. |
| `VISIBLE_SKUS_KEY` | `officeLicense::visibleSkus`, the saved key holding the JSON list of ticked plans. |
| `BundledOfficeRow` | `{ key, name, installs?, isGroup?, isChild?, devices? }`. |
| `groupOfficeInstalls(items, visibleSkus)` | Builds the display rows from the server breakdown and the ticked plans. |
| `availableValuesOf(saved)` | Extracts the `available::` entries from a saved map with the prefix stripped. |
| `visibleSkusOf(saved)` | Parses the saved plan list, falling back to all plans. |
| `toggleSku(visible, sku)` | Adds or removes one plan, returning the list in canonical order. |

## Uses

- `InstallBreakdownItem`, `ManualInputs` types from [API types](<../../../api/Reporting API - types.md>).

## Used By

- [OfficeWindowsReports page](<../Reporting Page - OfficeWindowsReports.md>) (`groupOfficeInstalls`).
- [useManualInputs](<Reporting Office Windows - useManualInputs.md>) (keys, parsers, `toggleSku`, `M365_DESKTOP_SKUS`).
- [SkuSettingsDialog](<Reporting Office Windows - SkuSettingsDialog.md>) (`M365_DESKTOP_SKUS`).
- [OfficeTable](<Reporting Office Windows - OfficeTable.md>) and [reportRows](<Reporting Office Windows - reportRows.md>) (`BundledOfficeRow` type).

## Key Behavior

- `groupOfficeInstalls`: if any variant exists, the first row is the group row with `installs` summed over variants and `devices` concatenated (not de-duplicated) from them; then one child row per entry of `visibleSkus`, in the order given, with no installs or devices; then one standalone row per non-variant item keyed by its name. With no variants the group and child rows are omitted entirely.
- Licence figures are saved under the bare product name (child rows use the SKU string, standalone rows the product name) so values entered before the Available column existed still load. Only Available figures carry the `available::` prefix.
- `visibleSkusOf` distinguishes "never configured" (key missing, unparsable or not an array: show all plans) from "every box unticked" (saved `[]`: show none). The parsed list is also filtered to known plans, in catalogue order, so a renamed or removed SKU drops out silently.
- `toggleSku` removes a present plan, otherwise rebuilds the list by filtering the catalogue, which is why the result is always in `M365_DESKTOP_SKUS` order rather than click order.

## Cleanup Notes

- `groupOfficeInstalls` uses `flatMap` for the group row's device list without de-duplication, whereas `useOfficeWindowsData` de-duplicates when merging group members; a device with two Microsoft 365 variants installed appears twice in the Office 365 device dialog.

## Source

[client/src/pages/reports/officeWindows/skus.ts](../../../../../client/src/pages/reports/officeWindows/skus.ts)
