# WindowsTable

> The Windows Installs section of the Office and Windows report: one row per Windows version with its install count and an editable licence figure.

## Purpose

Windows versions have no family grouping, so this table is the flat counterpart of `OfficeTable`: every row comes straight from the server's `windows_installs` breakdown (filtered to non-zero counts by the page) and every row can open its device list. It is a presentational component in the page layer.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `rows` | `InstallBreakdownItem[]` | yes | Windows versions with installs greater than zero. |
| `showLicenses` | `boolean` | yes | Shows or hides the Licenses column. |
| `licenses` | `ManualInputs` | yes | Licence text keyed by product name. |
| `onLicenseChange` | `(name: string, value: string) => void` | yes | Edit handler for the Licenses column. |
| `onOpenDevices` | `(title: string, devices: string[] or undefined) => void` | yes | Opens the device list for a row. |

## Uses

- `@mui/material` table primitives.
- [InstallsSection](<Reporting Office Windows - InstallsSection.md>) with `WINDOWS_ICON` from [assets util](<../../../utils/Reporting Util - assets.md>).
- [LicenseField](<Reporting Office Windows - LicenseField.md>) at a fixed 90px width.
- `InstallBreakdownItem` and `ManualInputs` types from [API types](<../../../api/Reporting API - types.md>).

## Used By

- [OfficeWindowsReports page](<../Reporting Page - OfficeWindowsReports.md>).

## Key Behavior

- Column widths: Product 50% / Installs 25% / Licenses 25% with licences shown, Product 70% / Installs 30% without.
- Every row is hoverable, has a pointer cursor and an underlined primary-coloured product name; clicking anywhere in the row except the licence cell opens the device list.
- The licence cell stops click propagation so typing does not open the dialog.
- Rows are keyed by `item.name`, and the licence value is looked up by the same name, so the key into the saved manual-inputs map is the bare Windows version string (for example "Windows 11"). This is why `useManualInputs` can back both tables from one saved map: Windows names and Office product names never collide.
- The placeholder for an empty licence field is "Enter", unlike the dash used in the Office table.
- There is no Available column; availability only makes sense for subscriptions.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/officeWindows/WindowsTable.tsx](../../../../../client/src/pages/reports/officeWindows/WindowsTable.tsx)
