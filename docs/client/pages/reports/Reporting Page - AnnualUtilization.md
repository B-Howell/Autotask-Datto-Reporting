# AnnualUtilization page

> The `/reports/annual-utilization` page: a twelve-month view of hours and cost per client, with summary, per-agency detail, raw entries and a spreadsheet mode.

## Purpose

`AnnualUtilization` is rendered at `/reports/annual-utilization` ("Annual Utilization"). It is
the most state-rich page: the fiscal-year start month, settings dialog visibility and raw
entry page are local; view mode, rates and the selected companies live in the annual
utilization store; and the report itself, its derived summary and the active tab come from
`useAnnualReport`. The page's job is to wire those together and choose which view to render
for the current tab and view mode.

Exports: "Export to Excel" and "Save to app", producing
`Annual Utilization <period>.xlsx` via `buildAnnualWorkbook` and `annualWorkbookFilename`
from the hook's `workbookInput`.

## Interface

`AnnualUtilization` takes no props and is the module's default export.

Local state: `startMonth: Dayjs | null` (from `defaultStartMonth`), `settingsOpen: boolean`,
`entryPage: number` (zero-based page of the raw entries table).

## Uses

- [useAnnualReport](<annualUtilization/Reporting Annual Utilization - useAnnualReport.md>),
  [annualUtilizationStore](<../../store/Reporting Store - annualUtilizationStore.md>)
- [utilization API](<../../api/Reporting API - utilization.md>) for `fetchUtilizationEntries`
  and the `UtilizationReport` type
- Annual modules: [excelExport](<annualUtilization/Reporting Annual Utilization - excelExport.md>),
  [fiscalYear](<annualUtilization/Reporting Annual Utilization - fiscalYear.md>),
  [gridModels](<annualUtilization/Reporting Annual Utilization - gridModels.md>),
  [summary](<annualUtilization/Reporting Annual Utilization - summary.md>),
  [ReportTabs](<annualUtilization/Reporting Annual Utilization - ReportTabs.md>),
  [SummaryTable](<annualUtilization/Reporting Annual Utilization - SummaryTable.md>),
  [AgencyDetailTable](<annualUtilization/Reporting Annual Utilization - AgencyDetailTable.md>),
  [RawEntriesTable](<annualUtilization/Reporting Annual Utilization - RawEntriesTable.md>),
  [SpreadsheetView](<annualUtilization/Reporting Annual Utilization - SpreadsheetView.md>),
  [ReportSettingsDialog](<annualUtilization/Reporting Annual Utilization - ReportSettingsDialog.md>),
  [YearStartPicker](<annualUtilization/Reporting Annual Utilization - YearStartPicker.md>)
- Report components [ReportPage](<../../components/report/Reporting Report Component - ReportPage.md>),
  [ReportToolbar](<../../components/report/Reporting Report Component - ReportToolbar.md>),
  [ReportActions](<../../components/report/Reporting Report Component - ReportActions.md>),
  [ErrorBanner](<../../components/report/Reporting Report Component - ErrorBanner.md>)
- [saveReport](<../../utils/Reporting Util - saveReport.md>), `dayjs` types

## Used By

- [App](<../../Reporting Client - App.md>) mounts it as the `annual-utilization` child of `/reports`.

## Key Behavior

- The date range is `rangeOrDefault(startMonth)`, memoised on the picker value; Generate and
  Refresh both call `report.generate(start, end, refresh)` with `false` and `true`.
- `entryPage` resets to 0 whenever `report.entriesFor` changes, so a new report or a new
  company tab starts the raw table at its first page.
- `renderView` order: spreadsheet mode wins over everything; otherwise `RAW_TAB` shows the raw
  entries, the empty-string tab shows the summary (clicking a company there selects its tab),
  and any other tab is a company name rendered by `AgencyDetailTable`.
- The spreadsheet grid is `gridForTab(tab, ...)`, memoised on tab, summary, rows, entries and
  detail, so switching view mode does not recompute it.
- Export takes the hook's `workbookInput` (built by
  [workbookInput](<annualUtilization/Reporting Annual Utilization - workbookInput.md>)) and
  needs `utilData` for the filename. If that input has no raw entries, because their load failed
  inside the job, the page fetches them with `fetchUtilizationEntries(start, end)` once more and
  substitutes them, so the workbook always has the raw sheet. Metadata: `agencyName: 'All Agencies'`, `reportType: 'annual_utilization'`.
- The toolbar summary reads `<selected> of <all> agencies` and `hrs(grandTotal)` hours, with a
  gear button that opens the settings dialog (view mode, rates, company selection).
- There is no `ReportProgress` here; progress for this report is shown by the running-report
  bar only.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/AnnualUtilization.tsx](../../../../client/src/pages/reports/AnnualUtilization.tsx)
