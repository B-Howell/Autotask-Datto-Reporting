# ReportMeta

> The header card of the patch report: title, description, create date, site name and device count.

## Purpose

The on-screen report mirrors the vendor's sample patch report, which opens with a block of metadata. This card renders that block from two values (agency name and device count) and the current time. It is a presentational component in the page layer.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `agencyName` | `string` | yes | Printed after "Sites:". For a group this is the group name. |
| `deviceCount` | `number` | yes | Printed after "Devices:". |

## Uses

- `@mui/material` (`Paper`, `Typography`).
- `dayjs` for the create date.

## Used By

- [PatchManagement page](<../Reporting Page - PatchManagement.md>), rendered only when `hasResults` is true.

## Key Behavior

- Lines, in order: the `h6` "Patch Management Summary Report"; "Description: This report shows the patch status by device"; "Create Date:" formatted `DD MMM YYYY HH:mm` and upper-cased (for example `09 OCT 2026 14:05`); "Sites:" with the agency name; "Devices:" with the count.
- The create date is evaluated on every render from `dayjs()`, so it is the time the component last rendered, not the time the data was fetched. The store's `syncedAt` is not shown here.
- Labels are bold through inline `<b>` elements inside `body2` text.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/patchManagement/ReportMeta.tsx](../../../../../client/src/pages/reports/patchManagement/ReportMeta.tsx)
