# hddTicketsStore

> Result and run state of the disk-space ticket report, plus the agency selection it was run for.

## Purpose

The HDD tickets report lists devices that the RMM keeps raising "drive nearly full" tickets for. Its result and the dropdown selection live here so the page can be revisited without regenerating. It is in the store layer and is filled only by `useHddTicketsData`.

## Interface

Not created by the `reportDataStore` factory; it has a bespoke shape with no `error` field.

| Field / action | Type | Description |
|---|---|---|
| `devices` | `HddTicketDevice[]` | Devices with disk-space tickets. |
| `deviceCount` | `number` | The server's `device_count`. |
| `loading`, `logs` | `boolean`, `string[]` | Job state fed by `useTrackedReport`. |
| `companyValue` | `AgencyValue \| ''` | Dropdown value; empty string means nothing chosen. Can be the `all` sentinel. |
| `generatedLabel` | `string` | Human label of the selection the current results belong to. |
| `setLogs(updater)` | updater setter | Accepts a value or `prev => next`. |
| other setters | plain | `setDevices`, `setDeviceCount`, `setLoading`, `setCompanyValue`, `setGeneratedLabel`. |

## Uses

- `zustand` (`create`)
- [reportDataStore](<Reporting Store - reportDataStore.md>) for `applyUpdater`, `Updater`
- [API types](<../api/Reporting API - types.md>) for `AgencyValue`, `HddTicketDevice`

## Used By

- [useHddTicketsData](<../hooks/Reporting Hook - useHddTicketsData.md>)

## Key Behavior

- `companyValue` and `generatedLabel` are separate on purpose: the dropdown can change after a run, and the page still needs to say which selection the table on screen came from.
- `deviceCount` is stored from the server rather than derived from `devices.length`.
- No persistence; a reload clears it.

## Cleanup Notes

- None noted.

## Source

[client/src/store/hddTicketsStore.ts](../../../client/src/store/hddTicketsStore.ts)
