# API types

> The TypeScript shape of every server response the client reads, plus the agency and agency-group types, so a renamed server field fails the build instead of rendering as undefined.

## Purpose

`client/src/api/types.ts` mirrors the payloads the server's aggregate functions emit. Field names are the server's: most are snake_case (`synced_at`, `device_count`), while the SLA and utilization reports use camelCase because the server emits them in the shape their Excel exports write. The file is re-exported wholesale from [index](<Reporting API - index.md>), so the rest of the client imports types from `@/api`.

One value lives here alongside the types: `isAgencyGroup`, the type guard that tells a plain agency from a group.

## Interface

Grouped by server domain, with the api module that fetches each and the store or hook that holds it.

| Domain | Types | Fetched by | Consumed by |
|---|---|---|---|
| Agencies | `Agency`, `AgencyGroup`, `EffectiveAgency`, `AgencyValue`, `isAgencyGroup` | [agencies](<Reporting API - agencies.md>) | [agencyStore](<../store/Reporting Store - agencyStore.md>), [useEffectiveAgencies](<../hooks/Reporting Hook - useEffectiveAgencies.md>), [agencyGroups util](<../utils/Reporting Util - agencyGroups.md>), [AgencySelect](<../components/report/Reporting Report Component - AgencySelect.md>); `AgencyValue` is the selected value in the device, ticket, HDD and patch stores |
| Devices | `SheetCell`, `DeviceSheetResponse`, `DeviceChange`, `DeviceUpdateResult` | [devices](<Reporting API - devices.md>) | [deviceDataStore](<../store/Reporting Store - deviceDataStore.md>), [useReportingData](<../hooks/Reporting Hook - useReportingData.md>) |
| Office/Windows | `InstallBreakdownItem`, `OfficeWindowsBreakdown` | [officeWindows](<Reporting API - officeWindows.md>) | [officeWindowsStore](<../store/Reporting Store - officeWindowsStore.md>), [useOfficeWindowsData](<../hooks/Reporting Hook - useOfficeWindowsData.md>) |
| Tickets | `RepairTime`, `FirstCallResolution`, `TicketDetails` | [tickets](<Reporting API - tickets.md>) | [ticketDataStore](<../store/Reporting Store - ticketDataStore.md>), [useTicketData](<../hooks/Reporting Hook - useTicketData.md>) |
| SLA | `SlaTicket`, `SlaPivotRow`, `SlaTarget`, `SlaReport` | [sla](<Reporting API - sla.md>) | [slaDataStore](<../store/Reporting Store - slaDataStore.md>), [useSlaData](<../hooks/Reporting Hook - useSlaData.md>) |
| Utilization | `UtilizationRow`, `UtilizationReport`, `UtilizationEntry`, `UtilizationEntriesResponse` | [utilization](<Reporting API - utilization.md>) | [agencyUtilizationStore](<../store/Reporting Store - agencyUtilizationStore.md>), [annualUtilizationStore](<../store/Reporting Store - annualUtilizationStore.md>), [useUtilizationData](<../hooks/Reporting Hook - useUtilizationData.md>) |
| Patch management | `PatchStatus`, `PatchSummaryItem`, `PatchDevice`, `PatchReport` | [patchManagement](<Reporting API - patchManagement.md>) | [patchManagementStore](<../store/Reporting Store - patchManagementStore.md>), [usePatchManagementData](<../hooks/Reporting Hook - usePatchManagementData.md>) |
| HDD tickets | `HddTicketDevice`, `HddTicketsReport` | [hddTickets](<Reporting API - hddTickets.md>) | [hddTicketsStore](<../store/Reporting Store - hddTicketsStore.md>), [useHddTicketsData](<../hooks/Reporting Hook - useHddTicketsData.md>) |
| Jobs | `JobProgress`, `JobStatus`, `ServerJob` | [jobs](<Reporting API - jobs.md>) | [reportJobStore](<../store/Reporting Store - reportJobStore.md>), [useServerJob](<../hooks/Reporting Hook - useServerJob.md>), [RunningReportBar](<../components/Reporting Component - RunningReportBar.md>), [reportJob util](<../utils/Reporting Util - reportJob.md>) |
| Sync | `SyncStatus`, `SyncTriggerResponse` | [sync](<Reporting API - sync.md>) | [useSyncStatus](<../pages/settings/Reporting Settings - useSyncStatus.md>), [DataSyncSection](<../pages/settings/Reporting Settings - DataSyncSection.md>) |
| Saved reports | `ReportFormat`, `SavedReport`, `SaveReportResponse` | [savedReports](<Reporting API - savedReports.md>) | [useSavedReports](<../pages/reports/savedReports/Reporting Saved Reports - useSavedReports.md>), [SavedReportViewer](<../components/Reporting Component - SavedReportViewer.md>), [saveReport util](<../utils/Reporting Util - saveReport.md>) |
| Manual inputs | `ManualInputs` | [manualInputs](<Reporting API - manualInputs.md>) | [useManualInputs](<../pages/reports/officeWindows/Reporting Office Windows - useManualInputs.md>) |
| Presets | `PresetReportType`, `ReportPreset`, `PresetInput` | [presets](<Reporting API - presets.md>) | [ScheduleDialog](<../components/report/Reporting Report Component - ScheduleDialog.md>), [useScheduleDialog](<../components/report/Reporting Report Component - useScheduleDialog.md>) |
| Schedules | `ReportSchedule`, `ScheduleInput`, `ScheduleRun`, `RunnerStatus`, `RendererHealth` | [schedules](<Reporting API - schedules.md>) | [useScheduleDialog](<../components/report/Reporting Report Component - useScheduleDialog.md>); the scheduled reports page once it exists |
| Tenant | `TenantSettings`, `GroupRule`, `RatedDepartment` | [tenant](<Reporting API - tenant.md>) | [tenantStore](<../store/Reporting Store - tenantStore.md>), [agencyGroups util](<../utils/Reporting Util - agencyGroups.md>) (`GroupRule`), [Annual Utilization departments](<../pages/reports/annualUtilization/Reporting Annual Utilization - departments.md>) (`RatedDepartment`) |

## Uses

- Nothing; this file has no imports.

## Used By

- Every api module, and through the barrel every store, hook, page and component listed above.

## Key Behavior

- `AgencyGroup` and `EffectiveAgency` are built on the client from the `GroupRule` list the tenant route serves; the server never sends a group object, though its tenant service resolves the same `group:<name>` value when a stored selection is used server-side. `isAgencyGroup` checks for a `members` property and `AgencyValue` is `number` for a company id or the string `group:<name>` for a group.
- `TenantSettings` mirrors the server's merged `DEFAULTS` plus `data/tenant.json`, so every key is always present and the store replaces its state wholesale. `GroupRule` and `RatedDepartment` live here rather than in the modules that use them because they are part of that response shape.
- `DeviceSheetResponse.ids[i]` can be `null` for rows cached before configuration item ids were stored; such rows cannot be written back.
- `SlaTicket` met flags are `boolean | null`; `null` means no target applied and must be excluded from percentages.
- `TicketDetails.synced_at` is optional because the merged result for an agency group does not carry one.
- `JobProgress` mirrors the `[PROGRESS]` JSON line from `server/core/progress.py`; `done`, `total`, `step` and `steps` are `null` when a phase has no count.
- `SavedReport.format` is `ReportFormat | string` because the server stores whatever extension it derived; the client treats unknown values as plain downloads.
- `PresetReportType` is the closed set of report types the server's preset service and the renderer accept; it is the key of the Schedule dialog's `REPORT_LABELS`, so adding a report type fails the build until a label exists. `ReportSchedule.preset` is `ReportPreset | null` because the join is by id and a row whose preset was removed out of band still lists.
- `ScheduleInput.enabled` is optional because the server defaults a new schedule to enabled; `next_run_at`, `last_run_at`, `last_status` and `last_error` are read-only and only ever come from the server.
- `PatchStatus` is a closed union of six strings and `PatchSummaryItem.label` is the display text for each; the client keys its donut colours on `status`, not `label`.

## Cleanup Notes

- None noted.

## Source

[client/src/api/types.ts](../../../client/src/api/types.ts)
