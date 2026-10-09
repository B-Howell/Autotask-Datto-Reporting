# HddDeviceTable

> The results table for the HDD storage tickets report: device, ticket count, last user and C: drive size.

## Purpose

`HddDeviceTable` renders the device list returned by the HDD tickets endpoint inside a
`Paper` with a heading. It declares its four columns as `DataColumn` definitions for the
shared `DataTable`, so the page carries no table markup and the column set lives in one
place next to the matching Excel export.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `label` | `string` | yes | The agency, group or `All Agencies` label for the heading. |
| `devices` | `HddTicketDevice[]` | yes | Rows, in server order. |
| `deviceCount` | `number` | yes | Count shown in the heading (from the server, not `devices.length`). |

Default export: `HddDeviceTable`.

## Uses

- Material UI `Paper` and `Typography`.
- [DataTable](<../../../components/report/Reporting Report Component - DataTable.md>) and its
  `DataColumn` type.
- [API types](<../../../api/Reporting API - types.md>) for `HddTicketDevice`.

## Used By

- [HddTickets page](<../Reporting Page - HddTickets.md>)

## Key Behavior

- Columns, in order: `Device Name` (left), `HDD Tickets` (centred), `Last User` (left),
  `C: Drive Size` (centred). The drive size renders as `<n> GB`, or a dash when
  `c_drive_gb` is null.
- The heading reads `<label>` followed by `<deviceCount> device` or `devices`, pluralised on
  the count.
- Row keys are `<device_name>-<index>`, so two devices with the same name do not collide.
- No sorting, paging or footer; the server orders the rows.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/hddTickets/HddDeviceTable.tsx](../../../../../client/src/pages/reports/hddTickets/HddDeviceTable.tsx)
