# slaDataStore

> The SLA performance report's result, loading flag, error and log tail, held outside the page so it survives navigation.

## Purpose

The SLA report is a month-scoped job that returns response and resolution figures against contracted targets. This store is the client-side home for its result. It is in the store layer and is the second instance of the shared report-data shape, alongside the quarterly utilization store.

## Interface

Created by the `reportDataStore` factory: `createReportDataStore<SlaReport>()`. It has exactly the `ReportDataState<SlaReport>` shape.

| Field / action | Type | Description |
|---|---|---|
| `data` | `SlaReport \| null` | The last successful report, or null. |
| `loading` | `boolean` | True while the job runs. |
| `error` | `string \| null` | Message from the last failed run. |
| `logs` | `string[]` | Log lines streamed during the current run. |
| `setData`, `setLoading`, `setError` | setters | Plain replacements. |
| `setLogs(updater)` | `(Updater<string[]>) => void` | Accepts a value or a `prev => next` function. |

## Uses

- [reportDataStore](<Reporting Store - reportDataStore.md>) for `createReportDataStore`
- [API types](<../api/Reporting API - types.md>) for `SlaReport`

## Used By

- [useSlaData](<../hooks/Reporting Hook - useSlaData.md>)

## Key Behavior

- `useSlaData` sets `data` to null before each run, so the page shows progress rather than the previous month's figures while a new month loads.
- The SLA filters (resource, priority, issue type checkboxes) are page state in `useSlaFilters`, not here.
- No persistence; a reload clears the result.

## Cleanup Notes

- None noted.

## Source

[client/src/store/slaDataStore.ts](../../../client/src/store/slaDataStore.ts)
