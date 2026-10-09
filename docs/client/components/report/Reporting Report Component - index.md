# report component barrel

> Re-exports the shared report components and their types so pages import from one path.

## Purpose

Report pages compose the same handful of building blocks. This barrel lets them write one import from `@/components/report` instead of a dozen, and makes the set of shared report components explicit. It is in the report component layer and contains no logic.

## Interface

| Export | From | Kind |
|---|---|---|
| `ReportPage` | ReportPage | component |
| `ReportToolbar` | ReportToolbar | component |
| `AgencySelect`, `ALL_AGENCIES` | AgencySelect | component, constant |
| `MonthYearSelect` | MonthYearSelect | component |
| `ReportActions`, `ExportAction` | ReportActions | component, type |
| `ReportProgress` | ReportProgress | component |
| `ErrorBanner` | ErrorBanner | component |
| `EmptyState` | EmptyState | component |
| `DataTable`, `DataColumn` | DataTable | component, type |
| `DonutChart`, `ChartLegend`, `DonutSlice` | DonutChart | components, type |
| `SettingsDialog` | SettingsDialog | component |
| `ScheduleDialog` | ScheduleDialog | component |
| `useScheduleDialog` | useScheduleDialog | hook |
| `REPORT_LABELS`, `PresetDraft` | scheduleDraft | constant, type |
| `SchedulePayload` | useScheduleForm | type |

## Uses

- [ReportPage](<Reporting Report Component - ReportPage.md>), [ReportToolbar](<Reporting Report Component - ReportToolbar.md>), [AgencySelect](<Reporting Report Component - AgencySelect.md>), [MonthYearSelect](<Reporting Report Component - MonthYearSelect.md>), [ReportActions](<Reporting Report Component - ReportActions.md>), [ReportProgress](<Reporting Report Component - ReportProgress.md>), [ErrorBanner](<Reporting Report Component - ErrorBanner.md>), [EmptyState](<Reporting Report Component - EmptyState.md>), [DataTable](<Reporting Report Component - DataTable.md>), [DonutChart](<Reporting Report Component - DonutChart.md>), [SettingsDialog](<Reporting Report Component - SettingsDialog.md>), [ScheduleDialog](<Reporting Report Component - ScheduleDialog.md>), [useScheduleDialog](<Reporting Report Component - useScheduleDialog.md>), [useScheduleForm](<Reporting Report Component - useScheduleForm.md>) (for `SchedulePayload` and the `scheduleDraft` exports)

## Used By

- The nine report pages under `client/src/pages/reports`, for example [DeviceReports](<../../pages/reports/Reporting Page - DeviceReports.md>) and [SavedReports](<../../pages/reports/Reporting Page - SavedReports.md>)
- Sub-components that use the shared table, chart or dialog: [RawEntriesTable](<../../pages/reports/annualUtilization/Reporting Annual Utilization - RawEntriesTable.md>), [ReportSettingsDialog](<../../pages/reports/annualUtilization/Reporting Annual Utilization - ReportSettingsDialog.md>), [HddDeviceTable](<../../pages/reports/hddTickets/Reporting HDD Tickets - HddDeviceTable.md>), [SkuSettingsDialog](<../../pages/reports/officeWindows/Reporting Office Windows - SkuSettingsDialog.md>), [PatchSummaryCard](<../../pages/reports/patchManagement/Reporting Patch Management - PatchSummaryCard.md>), [WorkstationTable](<../../pages/reports/patchManagement/Reporting Patch Management - WorkstationTable.md>)

## Key Behavior

- Nothing in the client imports a report component by its file path; every consumer goes through this barrel, so a component not listed here is effectively private.
- Types are re-exported with `export type`, so the barrel stays free of runtime value re-exports for types under `isolatedModules`.
- `useScheduleDialog` is the one hook in the barrel; it lives beside `ScheduleDialog` because the two are only useful together, and pages compose both from this one import. `RecipientsField`, `DayHourFields` and `useScheduleForm` are not exported: they are the dialog's own parts.

## Cleanup Notes

- None noted.

## Source

[client/src/components/report/index.ts](../../../../client/src/components/report/index.ts)
