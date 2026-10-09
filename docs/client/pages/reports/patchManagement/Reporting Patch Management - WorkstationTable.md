# WorkstationTable

> The "Workstations" table of the patch report: one row per device with its patch counts and a colour-coded status.

## Purpose

Below the summary donut the report lists every workstation so an engineer can see which machines need attention. This component declares the column set once as `DataColumn` definitions and renders them through the shared `DataTable`, so the on-screen table and the PDF table (which lists the same eight columns) stay aligned. It is a presentational component in the page layer; sorting is done upstream.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `devices` | `PatchDevice[]` | yes | Rows in display order (the data hook sorts them worst status first, then hostname). |

## Uses

- `@mui/material` (`Paper`, `Box`, `Typography`).
- [DataTable](<../../../components/report/Reporting Report Component - DataTable.md>) and the `DataColumn` type.
- `formatReboot` from [formatters](<Reporting Patch Management - formatters.md>); `STATUS_COLORS` from [statusColors](<Reporting Patch Management - statusColors.md>).
- `PatchDevice` type from [API types](<../../../api/Reporting API - types.md>).

## Used By

- [PatchManagement page](<../Reporting Page - PatchManagement.md>).

## Key Behavior

- Columns, in order: Device Name (`hostname`), Description, Last User, Last Reboot, Installed, Approved Pending, Not Approved, Patch Status. The three count columns are centre-aligned.
- Last Reboot is formatted `YYYY.MM.DD` by `formatReboot` and wrapped in a `nowrap` span so a narrow table does not break the date.
- Patch Status renders a 10px coloured dot from `STATUS_COLORS[d.status]` followed by the server's human label `status_label`; the dot colours match the donut and legend.
- Row keys are `<hostname>-<index>`, so duplicate hostnames across group members do not collide.
- The table has no pagination, sticky header or max height; a large site renders every row in one scrollable page.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/patchManagement/WorkstationTable.tsx](../../../../../client/src/pages/reports/patchManagement/WorkstationTable.tsx)
