# usePatchManagementData

> Runs the patch management report for an agency or group, merging member site reports into one summary and device list.

## Purpose

The patch report answers "what is the patch status across this client's workstations". The server reports per Datto site; a grouped agency needs those folded into one donut and one table. This hook does the fetch loop and the fold and writes `patchManagementStore`. It is in the hook layer.

## Interface

Returns `summary`, `devices`, `deviceCount`, `loading`, `selectedSite`, `logs`, `companyValue`, `generatedAgency`, `syncedAt` from the store, plus `setCompanyValue` and:

| Export | Description |
|---|---|
| `fetchPatchManagement(agency, refresh = false)` | Runs the tracked job; `refresh` makes the server bypass its snapshot. |
| `PATCH_STATUS_ORDER` | Donut and legend order with labels: FullyPatched, ApprovedPending, InstallError, RebootRequired, NoData, NoPolicy. Mirrors the server's `PATCH_STATUS_LABELS`. |
| `mergePatchReports(reports)` | Pure fold of `PatchReport[]` into `{ devices, summary, syncedAt }`. |

## Uses

- [patchManagement API](<../api/Reporting API - patchManagement.md>) for `fetchPatchReport`, `PATCH_LOGS_URL`
- [API types](<../api/Reporting API - types.md>) for `EffectiveAgency`, `PatchDevice`, `PatchReport`, `PatchStatus`, `PatchSummaryItem`
- [patchManagementStore](<../store/Reporting Store - patchManagementStore.md>)
- [agencyGroups util](<../utils/Reporting Util - agencyGroups.md>) for `membersOf`
- [useTrackedReport](<Reporting Hook - useTrackedReport.md>)

## Used By

- [PatchManagement page](<../pages/reports/Reporting Page - PatchManagement.md>)

## Key Behavior

- Label `Patch Management · <agency name>`, route `/reports/patch-management`; `generatedAgency` and `selectedSite` (first member's site, or null) are set before the job starts.
- Members are fetched sequentially with the abort signal; each call passes `refresh`.
- `mergePatchReports` seeds every status in `PATCH_STATUS_ORDER` with 0 so the summary is stable even when a site returns no devices, sums member counts, and keeps the oldest `synced_at` across members so "data as of" is never over-optimistic.
- Devices are sorted worst first using `STATUS_SEVERITY` (NoPolicy 0 through FullyPatched 5, unknown 6), then by hostname.
- On success `deviceCount` is `devices.length`; on failure `devices`, `deviceCount` and `summary` are cleared but `syncedAt` is not.

## Cleanup Notes

- `mergePatchReports` is exported but has no unit test.
- `syncedAt` survives a failed run beside an empty table.

## Source

[client/src/hooks/usePatchManagementData.ts](../../../client/src/hooks/usePatchManagementData.ts)
