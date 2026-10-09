# OfficeTable

> The Office section of the Office and Windows report: the Office 365 family heading with its subscription lines, then each perpetual edition, with editable licence columns.

## Purpose

Office 365 is licensed as one subscription family but detected as several products, so the on-screen table shows a bold "Office 365" group row carrying the install total and device list, indented child rows for each visible subscription SKU (licence figures only), and then standalone rows for perpetual editions such as Office LTSC. This component renders that shape from the rows produced by `groupOfficeInstalls` and wires the licence inputs and device drill-down back to the page. It is a presentational component in the page layer.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `rows` | `BundledOfficeRow[]` | yes | Output of `groupOfficeInstalls`; group, child and standalone rows in display order. |
| `showLicenses` | `boolean` | yes | Shows or hides the Licenses and Available columns. |
| `licenses` | `ManualInputs` | yes | Licence text per row key. |
| `available` | `ManualInputs` | yes | Available text per child row key. |
| `onLicenseChange` | `(key: string, value: string) => void` | yes | Edit handler for the Licenses column. |
| `onAvailableChange` | `(key: string, value: string) => void` | yes | Edit handler for the Available column. |
| `onOpenDevices` | `(title: string, devices: string[] or undefined) => void` | yes | Opens the device list for a clickable row. |

## Uses

- `@mui/material` table primitives.
- [InstallsSection](<Reporting Office Windows - InstallsSection.md>) for the icon and heading frame.
- [LicenseField](<Reporting Office Windows - LicenseField.md>) for both editable columns.
- `OFFICE_ICON` from [assets util](<../../../utils/Reporting Util - assets.md>).
- `BundledOfficeRow` type from [skus](<Reporting Office Windows - skus.md>); `ManualInputs` type from [API types](<../../../api/Reporting API - types.md>).

## Used By

- [OfficeWindowsReports page](<../Reporting Page - OfficeWindowsReports.md>).

## Key Behavior

- Column widths change with `showLicenses`: Product 40% / Installs 20% / Licenses 20% / Available 20% when shown, Product 70% / Installs 30% when hidden.
- Only rows backed by detected installs (group and standalone rows) are clickable and styled as underlined links; child SKU rows have a default cursor, secondary text colour and no hover highlight.
- Group rows are bold with extra vertical padding and have their bottom cell border removed, so the SKU lines read as part of the heading block. Child rows are indented (`pl: 4`).
- The Installs cell is blank for child rows; the total belongs to the family row.
- The Licenses input is rendered for child and standalone rows but not for the group row; the Available input is rendered for child rows only, because a perpetual edition has nothing to draw down against.
- Clicks inside the two input cells call `stopPropagation` so typing a figure does not open the device dialog.
- A missing key in `licenses` or `available` falls back to the empty string, so the field renders empty with the dash placeholder.

## Cleanup Notes

- `React.MouseEvent` is referenced at line 18 without importing `React`; it resolves through the global type namespace, which works but is inconsistent with the rest of the client, which imports types explicitly.

## Source

[client/src/pages/reports/officeWindows/OfficeTable.tsx](../../../../../client/src/pages/reports/officeWindows/OfficeTable.tsx)
