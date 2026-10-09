# ReportActions

> The right-hand button group every report shares, in a fixed order: exports, Save to app, Refresh data, Generate.

## Purpose

Each report page has the same set of actions with the same enable rules. Centralising them keeps the order and the disabled logic identical across pages and gives one place to change a label. It is in the report component layer and renders a fragment intended for `ReportToolbar`'s `actions` slot.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `onGenerate` | `() => void` | yes | Generate click. |
| `generateDisabled` | `boolean` | no | Extra disable condition for Generate (for example no agency chosen). |
| `loading` | `boolean` | no | Disables Generate and Refresh while a job runs. |
| `exports` | `ExportAction[]` | no | `{ label, onClick }` download buttons. |
| `onSave` | `() => void` | no | Shows "Save to app" when given. |
| `onRefresh` | `() => void` | no | Shows "Refresh data" when given. |
| `hasResults` | `boolean` | no | Enables export and save buttons. |

Exports the `ExportAction` type.

## Uses

- `@mui/material` (`Button`), `@mui/icons-material/Download`

## Used By

- Re-exported by [the report component barrel](<Reporting Report Component - index.md>)
- Every generating report page: [AgencyUtilization](<../../pages/reports/Reporting Page - AgencyUtilization.md>), [AnnualUtilization](<../../pages/reports/Reporting Page - AnnualUtilization.md>), [DeviceReports](<../../pages/reports/Reporting Page - DeviceReports.md>), [HddTickets](<../../pages/reports/Reporting Page - HddTickets.md>), [OfficeWindowsReports](<../../pages/reports/Reporting Page - OfficeWindowsReports.md>), [PatchManagement](<../../pages/reports/Reporting Page - PatchManagement.md>), [SlaPerformance](<../../pages/reports/Reporting Page - SlaPerformance.md>), [Tickets](<../../pages/reports/Reporting Page - Tickets.md>)

## Key Behavior

- Order is fixed: export buttons in the order given, then Save to app, then Refresh data, then Generate. Generate is the only contained button.
- Export and Save buttons are disabled until `hasResults`; Refresh is disabled while `loading`; Generate is disabled when `generateDisabled` or `loading`.
- Refresh carries a tooltip explaining it re-pulls from Autotask and Datto, ignoring the cache.
- Export buttons are keyed by label, so labels within one page must be unique.
- All buttons share a 130 px minimum width so the group does not reflow as labels change.

## Cleanup Notes

- Covered by `ReportActions.test.tsx`.

## Source

[client/src/components/report/ReportActions.tsx](../../../../client/src/components/report/ReportActions.tsx)
