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

## Uses

- [ReportPage](<Reporting Report Component - ReportPage.md>), [ReportToolbar](<Reporting Report Component - ReportToolbar.md>), [AgencySelect](<Reporting Report Component - AgencySelect.md>), [MonthYearSelect](<Reporting Report Component - MonthYearSelect.md>), [ReportActions](<Reporting Report Component - ReportActions.md>), [ReportProgress](<Reporting Report Component - ReportProgress.md>), [ErrorBanner](<Reporting Report Component - ErrorBanner.md>), [EmptyState](<Reporting Report Component - EmptyState.md>), [DataTable](<Reporting Report Component - DataTable.md>), [DonutChart](<Reporting Report Component - DonutChart.md>), [SettingsDialog](<Reporting Report Component - SettingsDialog.md>)

## Used By

- The nine report pages under `client/src/pages/reports`, for example [DeviceReports](<../../pages/reports/Reporting Page - DeviceReports.md>) and [SavedReports](<../../pages/reports/Reporting Page - SavedReports.md>)
- Sub-components that use the shared table, chart or dialog: [RawEntriesTable](<../../pages/reports/annualUtilization/Reporting Annual Utilization - RawEntriesTable.md>), [ReportSettingsDialog](<../../pages/reports/annualUtilization/Reporting Annual Utilization - ReportSettingsDialog.md>), [HddDeviceTable](<../../pages/reports/hddTickets/Reporting HDD Tickets - HddDeviceTable.md>), [SkuSettingsDialog](<../../pages/reports/officeWindows/Reporting Office Windows - SkuSettingsDialog.md>), [PatchSummaryCard](<../../pages/reports/patchManagement/Reporting Patch Management - PatchSummaryCard.md>), [WorkstationTable](<../../pages/reports/patchManagement/Reporting Patch Management - WorkstationTable.md>)

## Key Behavior

- Nothing in the client imports a report component by its file path; every consumer goes through this barrel, so a component not listed here is effectively private.
- Types are re-exported with `export type`, so the barrel stays free of runtime value re-exports for types under `isolatedModules`.

## Cleanup Notes

- None noted.

## Source

[client/src/components/report/index.ts](../../../../client/src/components/report/index.ts)
