# useOfficeWindowsData

> Runs the Office and Windows licensing report for an agency or group and merges member breakdowns into one.

## Purpose

The licensing report returns, per Datto site, a list of Windows versions and a list of Office products with install counts and the devices carrying each. For a grouped agency the page should show one combined breakdown, so this hook fetches each member in turn and merges. It is in the hook layer and is the only writer of `officeWindowsStore`.

## Interface

Returns `osBreakdown`, `officeBreakdown`, `loading`, `selectedSite`, `logs` from the store, plus:

| Function | Description |
|---|---|
| `fetchOfficeWindowsBreakdown(agency)` | Runs one tracked job covering every member of the agency. Resolves immediately if the agency has no members. |

Module helper `mergeBreakdowns(existing, incoming)` (not exported): sums `installs` per product name and unions the device lists.

## Uses

- [officeWindows API](<../api/Reporting API - officeWindows.md>) for `fetchOfficeWindowsBreakdown`, `officeWindowsLogsUrl`
- [API types](<../api/Reporting API - types.md>) for `EffectiveAgency`, `InstallBreakdownItem`
- [officeWindowsStore](<../store/Reporting Store - officeWindowsStore.md>)
- [agencyGroups util](<../utils/Reporting Util - agencyGroups.md>) for `membersOf`
- [useTrackedReport](<Reporting Hook - useTrackedReport.md>)

## Used By

- [OfficeWindowsReports page](<../pages/reports/Reporting Page - OfficeWindowsReports.md>)

## Key Behavior

- Label `Office / Windows · <agency name>`, route `/reports/office-windows`. A group is one job to whoever is watching the status bar.
- `selectedSite` is set to the first member's site before the job starts.
- Members are fetched sequentially, each with the job's abort signal, so Cancel stops at the current member.
- The log stream is opened on the first member's `officeWindowsLogsUrl` only; later members' server logs are not streamed to the page.
- Merging keys on product `name`; device lists are de-duplicated with a `Set` so a device present in two members' results is counted once in the drill-down while `installs` is still the plain sum.
- On failure both breakdowns are cleared. No `setError` is passed.

## Cleanup Notes

- `mergeBreakdowns` has no unit test.

## Source

[client/src/hooks/useOfficeWindowsData.ts](../../../client/src/hooks/useOfficeWindowsData.ts)
