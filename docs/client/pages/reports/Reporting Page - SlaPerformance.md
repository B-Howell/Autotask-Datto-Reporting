# SlaPerformance page

> The `/reports/sla-performance` page: every ticket's response and resolution against SLA targets for one month, with filters and three pivots, exportable to xlsx.

## Purpose

`SlaPerformance` is rendered at `/reports/sla-performance` ("SLA Performance"). It fetches a
month of tickets across all companies through `useSlaData` (backed by the SLA data store),
applies the user's filters via `useSlaFilters`, and derives three pivots (by resource, by
priority sorted in priority order, and by issue type) from the filtered set. Four tabs switch
between the raw grid and the pivots. This report is not per agency; the month and year are
the only inputs.

Export: "Export Excel" and "Save to app", named
`SLA Performance By Ticket <Month><Year>.xlsx` by `slaExportFilename`, built from the filtered
tickets and the three pivots.

## Interface

`SlaPerformance` takes no props and is the module's default export.

Local state: `month: MonthName` and `year: number`, both defaulting to last month; `tab:
number` (0 Report, 1 Pivot by Resource, 2 Pivot by Priority, 3 Pivot by Issue Type).

## Uses

- [useSlaData](<../../hooks/Reporting Hook - useSlaData.md>)
- SLA modules: [useSlaFilters](<slaPerformance/Reporting SLA - useSlaFilters.md>),
  [pivots](<slaPerformance/Reporting SLA - pivots.md>),
  [excelExport](<slaPerformance/Reporting SLA - excelExport.md>),
  [SlaFilters](<slaPerformance/Reporting SLA - SlaFilters.md>),
  [RawDataGrid](<slaPerformance/Reporting SLA - RawDataGrid.md>),
  [PivotTable](<slaPerformance/Reporting SLA - PivotTable.md>),
  [IssueTypePivotTable](<slaPerformance/Reporting SLA - IssueTypePivotTable.md>)
- Report components [ReportPage](<../../components/report/Reporting Report Component - ReportPage.md>),
  [ReportToolbar](<../../components/report/Reporting Report Component - ReportToolbar.md>),
  [ReportActions](<../../components/report/Reporting Report Component - ReportActions.md>),
  [MonthYearSelect](<../../components/report/Reporting Report Component - MonthYearSelect.md>),
  [ReportProgress](<../../components/report/Reporting Report Component - ReportProgress.md>),
  [ErrorBanner](<../../components/report/Reporting Report Component - ErrorBanner.md>)
- [dates](<../../utils/Reporting Util - dates.md>) (`MONTH_NAMES`), [saveReport](<../../utils/Reporting Util - saveReport.md>)

## Used By

- [App](<../../Reporting Client - App.md>) mounts it as the `sla-performance` child of `/reports`.

## Key Behavior

- `lastMonth()` returns the previous calendar month, rolling back to December of the previous
  year in January, because last month is the most recent one with a complete ticket set.
- Generate calls `fetchSlaPerformance(year, monthIndex + 1)`; the month is sent 1-based.
- The pivots are memoised on `filteredTickets`, so changing a filter recomputes all three but
  switching tabs does not. `pivotByPriority` is `sortByPriority(buildPivot(...))`.
- The export uses the filtered tickets, not the full response, so the workbook reflects the
  on-screen filters. The filename uses the response's `month` and `year`, not the picker,
  so it names the data actually exported. Metadata: `agencyName: 'All Agencies'`,
  `reportType: 'sla'`, `format: 'xlsx'`.
- The toolbar summary shows `<filtered count> tickets across <company count> companies`,
  where the company count is the number of keys in `slaData.companies`.
- Filters, tabs and tables render only when data exists and the page is not loading.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/SlaPerformance.tsx](../../../../client/src/pages/reports/SlaPerformance.tsx)
