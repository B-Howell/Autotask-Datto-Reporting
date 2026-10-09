# useUtilizationData

> Shared fetcher for the quarterly and annual utilization reports, parameterised by the store that holds the result and the label the status bar shows.

## Purpose

Both utilization reports call the same endpoint with different date ranges; they differ only in which store keeps the result, what the status bar calls the run, which page the row links back to, and whether extra work (the annual raw entries) must finish before the report counts as done. This hook takes those four things as arguments. It is in the hook layer.

## Interface

`useUtilizationData(store, label, route, afterFetch?)` returns `utilData`, `loading`, `error`, `logs` and:

| Argument / return | Description |
|---|---|
| `store` | A `UseBoundStore<StoreApi<ReportDataState<UtilizationReport>>>`, typically a factory-built store. |
| `label` | Report name for the status bar, for example `Annual Utilization`. |
| `route` | Page path for the "Go to report" button. |
| `afterFetch(report, signal)` | Optional; awaited inside the job after the report arrives. |
| `fetchUtilization(start, end, { refresh })` | Memoised fetcher; `refresh` makes the server re-pull from Autotask. |

## Uses

- `react` (`useCallback`), `zustand` types
- [utilization API](<../api/Reporting API - utilization.md>) for `fetchUtilizationReport`, `UTILIZATION_LOGS_URL`
- [API types](<../api/Reporting API - types.md>) for `UtilizationReport`
- [reportDataStore](<../store/Reporting Store - reportDataStore.md>) for the `ReportDataState` type
- [useTrackedReport](<Reporting Hook - useTrackedReport.md>)

## Used By

- [AgencyUtilization page](<../pages/reports/Reporting Page - AgencyUtilization.md>) with `agencyUtilizationStore`
- [useAnnualReport](<../pages/reports/annualUtilization/Reporting Annual Utilization - useAnnualReport.md>) with `annualUtilizationStore` and a `loadEntries` callback

## Key Behavior

- Label `<label> · <start> to <end>`; the trailing range is what `reportJobStore.runKey` matches against the server's own `Utilization · <range>` row.
- `setData(null)` runs before the job so the old report is not shown as the new one loads.
- `afterFetch` runs inside `run`, before `onSuccess`, so the job and the loading flag stay active until it resolves; a report with raw entries outstanding does not present as finished early.
- Without `refresh` the server answers from its snapshot in well under a second; with it a full Autotask pull can take minutes.
- `setError` is passed, so failures land in the store and the page's `ErrorBanner`.

## Cleanup Notes

- None noted.

## Source

[client/src/hooks/useUtilizationData.ts](../../../client/src/hooks/useUtilizationData.ts)
