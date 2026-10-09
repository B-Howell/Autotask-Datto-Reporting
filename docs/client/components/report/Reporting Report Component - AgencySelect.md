# AgencySelect

> The agency dropdown every agency-scoped report shares, with an optional "All Agencies" entry.

## Purpose

Five report pages need the same small select of effective agencies (raw agencies with groups collapsed). This component renders it from the list the page passes in and reports the chosen value, which is either an agency id or a group key. It is in the report component layer.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `agencies` | `EffectiveAgency[]` | yes | Entries to list, usually from `useEffectiveAgencies`. |
| `value` | `AgencyValue \| ''` | yes | Selected value; empty string for none. |
| `onChange` | `(value: AgencyValue \| '') => void` | yes | Receives the raw select value. |
| `includeAll` | `boolean` | no | Adds an "All Agencies" entry whose value is `ALL_AGENCIES` (`'all'`). Default false. |
| `label` | `string` | no | Field label. Default `Select Agency`. |

Exports `ALL_AGENCIES`.

## Uses

- `@mui/material` (`TextField`, `MenuItem`)
- [API types](<../../api/Reporting API - types.md>) for `AgencyValue`, `EffectiveAgency`
- [agencyGroups util](<../../utils/Reporting Util - agencyGroups.md>) for `valueFor`

## Used By

- Re-exported by [the report component barrel](<Reporting Report Component - index.md>)
- [DeviceReports page](<../../pages/reports/Reporting Page - DeviceReports.md>)
- [HddTickets page](<../../pages/reports/Reporting Page - HddTickets.md>), the only user of `includeAll`
- [OfficeWindowsReports page](<../../pages/reports/Reporting Page - OfficeWindowsReports.md>)
- [PatchManagement page](<../../pages/reports/Reporting Page - PatchManagement.md>)
- [Tickets page](<../../pages/reports/Reporting Page - Tickets.md>)

## Key Behavior

- Menu item keys and values are `valueFor(agency)`: the numeric id for a plain agency, the prefixed group key for a group. Resolving a value back to an agency is the caller's job via `agencyGroups`.
- The select passes `e.target.value` through untouched, so numeric ids arrive as numbers from MUI's select and group keys as strings.
- Small size, 240 px minimum width, matching the other toolbar fields.

## Cleanup Notes

- Covered by `AgencySelect.test.tsx`.

## Source

[client/src/components/report/AgencySelect.tsx](../../../../client/src/components/report/AgencySelect.tsx)
