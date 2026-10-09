# AgencyUtilization page

> The `/reports/agency-utilization` page: engineer hours per client for one calendar quarter, by billing tier and person, exportable to xlsx.

## Purpose

`AgencyUtilization` is rendered at `/reports/agency-utilization` ("Quarterly Utilization").
It picks a quarter from `quarterChoices()`, runs the shared `useUtilizationData` fetcher
against the agency utilization store with the label `Quarterly Utilization`, and renders the
result in `UtilizationTable`. The quarterly and annual pages share one endpoint and one hook;
this page differs only in the date-range picker and the store that holds the result.

Exports: "Export Excel" and "Save to app", producing `Agency Utilization <period>.xlsx` via
`buildQuarterlyWorkbook` and `utilizationExportFilename`, where the period is the server's
`periodLabel` or `<start> to <end>`.

## Interface

`AgencyUtilization` takes no props and is the module's default export.

Local state: `quarterKey: string`, initialised from `defaultQuarterKey`. The quarter list is
memoised on the tenant store's `earliestQuarterYear`, which the page subscribes to and passes
into `quarterChoices`, so it is built once per mount and once more if the tenant settings
arrive after the first render.

## Uses

- [useUtilizationData](<../../hooks/Reporting Hook - useUtilizationData.md>)
- [agencyUtilizationStore](<../../store/Reporting Store - agencyUtilizationStore.md>)
- [tenantStore](<../../store/Reporting Store - tenantStore.md>) for `earliestQuarterYear`
- [QuarterSelect](<agencyUtilization/Reporting Agency Utilization - QuarterSelect.md>),
  [UtilizationTable](<agencyUtilization/Reporting Agency Utilization - UtilizationTable.md>),
  [excelExport](<agencyUtilization/Reporting Agency Utilization - excelExport.md>),
  [quarters](<agencyUtilization/Reporting Agency Utilization - quarters.md>)
- Report components [ReportPage](<../../components/report/Reporting Report Component - ReportPage.md>),
  [ReportToolbar](<../../components/report/Reporting Report Component - ReportToolbar.md>),
  [ReportActions](<../../components/report/Reporting Report Component - ReportActions.md>),
  [ReportProgress](<../../components/report/Reporting Report Component - ReportProgress.md>),
  [ErrorBanner](<../../components/report/Reporting Report Component - ErrorBanner.md>)
- [saveReport](<../../utils/Reporting Util - saveReport.md>)

## Used By

- [App](<../../Reporting Client - App.md>) mounts it as the `agency-utilization` child of `/reports`.

## Key Behavior

- `selected` is the choice whose key matches `quarterKey`, falling back to the first choice,
  so a stale key can never leave the page without a range.
- Generate calls `fetchUtilization(start, end, { refresh: false })`, which the server answers
  from its snapshot when one exists; the Refresh button passes `refresh: true` to re-pull
  from Autotask. The hook registers the run with the status bar under
  `Quarterly Utilization` and route `/reports/agency-utilization`.
- Generate is never disabled by selection because a quarter is always selected.
- Once data exists the toolbar shows a summary line: worker row count, company count and
  `grandTotal` to two decimals. Optional chaining guards against a response missing those
  fields.
- Export buttons are enabled by `hasResults = !!utilData`; saved-report metadata uses
  `agencyName: 'All Agencies'`, `reportType: 'utilization'`, `format: 'xlsx'`.
- The table renders only when data exists and the page is not loading; `ReportProgress`
  shows the hook's logs during a run.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/AgencyUtilization.tsx](../../../../client/src/pages/reports/AgencyUtilization.tsx)
