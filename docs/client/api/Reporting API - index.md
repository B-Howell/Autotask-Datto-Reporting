# API index

> The barrel that exposes every api module as a namespace (`devicesApi`, `slaApi`, ...) and re-exports all response types, so the rest of the client imports from `@/api` only.

## Purpose

`client/src/api/index.ts` is the public face of the api layer. Hooks, stores and pages write `import { devicesApi } from '@/api'` and `import type { SlaReport } from '@/api'`; they never reach into individual files. Namespacing each module keeps call sites readable (`devicesApi.fetchDeviceSheet`) and avoids name collisions between modules that all export a `fetch...` function.

## Interface

| Export | Kind | Source module |
|---|---|---|
| `*` from `./types` | types, `isAgencyGroup` | [types](<Reporting API - types.md>) |
| `ApiError` | class | [client](<Reporting API - client.md>) |
| `agenciesApi` | namespace | [agencies](<Reporting API - agencies.md>) |
| `devicesApi` | namespace | [devices](<Reporting API - devices.md>) |
| `officeWindowsApi` | namespace | [officeWindows](<Reporting API - officeWindows.md>) |
| `ticketsApi` | namespace | [tickets](<Reporting API - tickets.md>) |
| `slaApi` | namespace | [sla](<Reporting API - sla.md>) |
| `utilizationApi` | namespace | [utilization](<Reporting API - utilization.md>) |
| `patchApi` | namespace | [patchManagement](<Reporting API - patchManagement.md>) |
| `hddTicketsApi` | namespace | [hddTickets](<Reporting API - hddTickets.md>) |
| `jobsApi` | namespace | [jobs](<Reporting API - jobs.md>) |
| `syncApi` | namespace | [sync](<Reporting API - sync.md>) |
| `manualInputsApi` | namespace | [manualInputs](<Reporting API - manualInputs.md>) |
| `savedReportsApi` | namespace | [savedReports](<Reporting API - savedReports.md>) |

## Uses

- Every module in `client/src/api/` listed above.

## Used By

- All report hooks under `docs/client/hooks/`, for example [useReportingData](<../hooks/Reporting Hook - useReportingData.md>), [useSlaData](<../hooks/Reporting Hook - useSlaData.md>) and [useServerJob](<../hooks/Reporting Hook - useServerJob.md>).
- All stores under `docs/client/store/`, for example [agencyStore](<../store/Reporting Store - agencyStore.md>) and [reportJobStore](<../store/Reporting Store - reportJobStore.md>).
- Components and pages that need response types, such as [RunningReportBar](<../components/Reporting Component - RunningReportBar.md>), [SavedReportViewer](<../components/Reporting Component - SavedReportViewer.md>) and [AgencySelect](<../components/report/Reporting Report Component - AgencySelect.md>).
- Utils: [agencyGroups](<../utils/Reporting Util - agencyGroups.md>), [reportJob](<../utils/Reporting Util - reportJob.md>), [saveReport](<../utils/Reporting Util - saveReport.md>).

## Key Behavior

- The namespace alias does not always match the file name: `patchManagement.ts` is exposed as `patchApi`, and the rest drop nothing. New modules should follow the `<domain>Api` pattern.
- `savedReports.ts` also exports the `SavedReportMeta` interface, which is not in `types.ts`; the one consumer that needs it as a type imports it from `@/api/savedReports` directly (see [saveReport util](<../utils/Reporting Util - saveReport.md>)).
- Because the types are re-exported with `export *`, a type added to `types.ts` is immediately importable from `@/api` with no change here.
- `client.ts` helpers (`getJson`, `query`, ...) are deliberately not re-exported; only api modules should build URLs.

## Cleanup Notes

- None noted.

## Source

[client/src/api/index.ts](../../../client/src/api/index.ts)
