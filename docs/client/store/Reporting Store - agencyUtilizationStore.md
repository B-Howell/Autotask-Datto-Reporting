# agencyUtilizationStore

> The quarterly utilization report's result, loading flag, error and log tail, held outside the page so it survives navigation.

## Purpose

The quarterly ("agency") utilization report is a long-running job whose result should still be on screen after the user visits another page and comes back. This store is the client-side home for that result. It is in the store layer and is one of the two instances of the shared report-data shape (the other is the SLA store).

It exists as its own module, rather than a shared utilization store, because the quarterly and annual reports call the same endpoint with different ranges and must not overwrite each other's results.

## Interface

Created by the `reportDataStore` factory: `createReportDataStore<UtilizationReport>()`. It therefore has exactly the `ReportDataState<UtilizationReport>` shape.

| Field / action | Type | Description |
|---|---|---|
| `data` | `UtilizationReport \| null` | The last successful report, or null. |
| `loading` | `boolean` | True while the job runs. |
| `error` | `string \| null` | Message from the last failed run. |
| `logs` | `string[]` | Log lines streamed during the current run. |
| `setData`, `setLoading`, `setError` | setters | Plain replacements. |
| `setLogs(updater)` | `(Updater<string[]>) => void` | Accepts a value or a `prev => next` function. |

## Uses

- [reportDataStore](<Reporting Store - reportDataStore.md>) for `createReportDataStore`
- [API types](<../api/Reporting API - types.md>) for `UtilizationReport`

## Used By

- [AgencyUtilization page](<../pages/reports/Reporting Page - AgencyUtilization.md>), which passes the store into `useUtilizationData`

## Key Behavior

- The store is passed as a value into [useUtilizationData](<../hooks/Reporting Hook - useUtilizationData.md>), which selects `data`, `loading`, `error` and `logs` from it and takes the setters via `getState()`.
- No persistence: a page reload clears the result. The server-side snapshot cache makes re-generating cheap.
- Nothing in this module holds quarter selection or rates; those are page state.

## Cleanup Notes

- None noted.

## Source

[client/src/store/agencyUtilizationStore.ts](../../../client/src/store/agencyUtilizationStore.ts)
