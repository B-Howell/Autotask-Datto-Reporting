# patchManagementStore

> Result and run state of the patch management report: status summary, device list, snapshot time and the agency it was run for.

## Purpose

The patch report shows patch status across an agency's workstations as a donut plus a device table. This store holds the merged result and the job state so the page can be revisited. It is in the store layer and is filled only by `usePatchManagementData`.

## Interface

Not created by the `reportDataStore` factory; bespoke shape with no `error` field.

| Field / action | Type | Description |
|---|---|---|
| `summary` | `PatchSummaryItem[]` | One entry per patch status with its label and count, in donut order. |
| `devices` | `PatchDevice[]` | Workstations sorted worst status first. |
| `deviceCount` | `number` | `devices.length` at the time of the last run. |
| `loading`, `logs` | `boolean`, `string[]` | Job state fed by `useTrackedReport`. |
| `selectedSite` | `string \| null` | Datto site id of the first member of the agency the results belong to. |
| `companyValue` | `AgencyValue \| ''` | Dropdown value; empty string means nothing chosen. |
| `generatedAgency` | `EffectiveAgency \| null` | The agency or group the current results belong to, used for headings and export names. |
| `syncedAt` | `string \| null` | Oldest member snapshot time, shown as "data as of". |
| `setLogs(updater)` | updater setter | Accepts a value or `prev => next`. |
| other setters | plain | `setSummary`, `setDevices`, `setDeviceCount`, `setLoading`, `setSelectedSite`, `setCompanyValue`, `setGeneratedAgency`, `setSyncedAt`. |

## Uses

- `zustand` (`create`)
- [reportDataStore](<Reporting Store - reportDataStore.md>) for `applyUpdater`, `Updater`
- [API types](<../api/Reporting API - types.md>) for `AgencyValue`, `EffectiveAgency`, `PatchDevice`, `PatchSummaryItem`

## Used By

- [usePatchManagementData](<../hooks/Reporting Hook - usePatchManagementData.md>)

## Key Behavior

- `generatedAgency` holds the whole `EffectiveAgency` object rather than a value, because the PDF export and heading need the display name and the member list.
- `syncedAt` is the oldest of the member snapshots, chosen in the hook so a group never claims to be fresher than its stalest member.
- On a failed run the hook clears `summary`, `devices` and `deviceCount` but leaves `syncedAt` and `generatedAgency` as they were.

## Cleanup Notes

- `syncedAt` is not reset on failure, so a failed re-run can leave a stale "data as of" time beside an empty table.

## Source

[client/src/store/patchManagementStore.ts](../../../client/src/store/patchManagementStore.ts)
