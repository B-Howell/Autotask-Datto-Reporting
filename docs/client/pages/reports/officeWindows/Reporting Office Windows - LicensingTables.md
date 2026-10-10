# LicensingTables

> The licensing report body: the heading with its licence switch, then the Office and Windows tables that have rows.

## Purpose

Once the licensing report has results, the page shows a heading and up to two tables that
share the licence map, the licence toggle and the device-list modal. This component owns that
arrangement so the page passes the data once and the show-or-hide rules for each table live
next to the tables they govern.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | yes | The report title from `reportTitle(agencyName)`. |
| `showLicenses` | `boolean` | yes | Whether the licence columns are shown. |
| `onShowLicensesChange` | `(show: boolean) => void` | yes | The heading's switch handler. |
| `officeRows` | `BundledOfficeRow[]` | yes | Office installs grouped by SKU. |
| `hasOfficeInstalls` | `boolean` | yes | Whether the raw Office breakdown has any rows; the Office table renders only then. |
| `osRows` | `InstallBreakdownItem[]` | yes | Windows versions with installs; the Windows table renders only when non-empty. |
| `licenses`, `available` | `ManualInputs` | yes | The agency's saved licence counts and Available counts. |
| `onOfficeLicenseChange`, `onOfficeAvailableChange`, `onOsLicenseChange` | `(key: string, value: string) => void` | yes | Field handlers from `useManualInputs`. |
| `onOpenDevices` | `(title: string, devices: string[] \| undefined) => void` | yes | Opens the device-list modal. |

Default export: `LicensingTables`.

## Uses

- `@mui/material` (`Box`); `InstallBreakdownItem` and `ManualInputs` from the API types
- [ReportHeading](<Reporting Office Windows - ReportHeading.md>), [OfficeTable](<Reporting Office Windows - OfficeTable.md>), [WindowsTable](<Reporting Office Windows - WindowsTable.md>)
- [skus](<Reporting Office Windows - skus.md>) for the `BundledOfficeRow` type

## Used By

- [OfficeWindowsReports page](<../Reporting Page - OfficeWindowsReports.md>) when `hasResults` and the reported agency is known

## Key Behavior

- The Office table's condition is `hasOfficeInstalls`, taken from the raw breakdown rather than
  `officeRows`, so hiding every SKU in the settings leaves an empty Office table rather than
  removing it, as the page did before this component existed.
- Both tables read licence figures from the same `licenses` map; `available` is only for the
  Office table.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/officeWindows/LicensingTables.tsx](../../../../../client/src/pages/reports/officeWindows/LicensingTables.tsx)
