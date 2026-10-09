# officeWindowsStore

> Result and run state of the Office and Windows licensing report: the two install breakdowns and the site they were run for.

## Purpose

The licensing report counts installed Office products and Windows versions per agency. This store holds the two breakdown lists and the job state so the page survives navigation. It is in the store layer and is filled only by `useOfficeWindowsData`.

## Interface

Not created by the `reportDataStore` factory; bespoke shape with no `error` field.

| Field / action | Type | Description |
|---|---|---|
| `osBreakdown` | `InstallBreakdownItem[]` | Windows versions with install counts and device lists. |
| `officeBreakdown` | `InstallBreakdownItem[]` | Office products with install counts and device lists. |
| `loading`, `logs` | `boolean`, `string[]` | Job state fed by `useTrackedReport`. |
| `selectedSite` | `string \| null` | Datto site id of the first member of the agency the results belong to. |
| `setLogs(updater)` | updater setter | Accepts a value or `prev => next`. |
| other setters | plain | `setOsBreakdown`, `setOfficeBreakdown`, `setLoading`, `setSelectedSite`. |

## Uses

- `zustand` (`create`)
- [reportDataStore](<Reporting Store - reportDataStore.md>) for `applyUpdater`, `Updater`
- [API types](<../api/Reporting API - types.md>) for `InstallBreakdownItem`

## Used By

- [useOfficeWindowsData](<../hooks/Reporting Hook - useOfficeWindowsData.md>)

## Key Behavior

- For a grouped agency the hook merges every member's breakdown before storing, so the store only ever holds one combined list per category.
- `selectedSite` is set before the job starts, so it reflects the run in flight rather than the last finished one.
- The manual licence counts entered against each product are not here; they are server-side manual inputs handled by the page's `useManualInputs`.

## Cleanup Notes

- None noted.

## Source

[client/src/store/officeWindowsStore.ts](../../../client/src/store/officeWindowsStore.ts)
