# useSlaData

> Runs the SLA performance report for one month as a tracked job and exposes `slaDataStore`.

## Purpose

The SLA report is scoped to a year and month rather than an agency. This hook is the thinnest of the report hooks: it binds the factory-built `slaDataStore` to `useTrackedReport` and exposes a memoised fetcher. It is in the hook layer.

## Interface

Returns `slaData`, `loading`, `error`, `logs` from the store, plus:

| Function | Description |
|---|---|
| `fetchSlaPerformance(year, month)` | Clears `data`, then runs the tracked job for that month. Memoised with `useCallback`. |

## Uses

- `react` (`useCallback`)
- [sla API](<../api/Reporting API - sla.md>) for `fetchSlaReport`, `SLA_LOGS_URL`
- [slaDataStore](<../store/Reporting Store - slaDataStore.md>)
- [useTrackedReport](<Reporting Hook - useTrackedReport.md>)

## Used By

- [SlaPerformance page](<../pages/reports/Reporting Page - SlaPerformance.md>)

## Key Behavior

- Label `SLA Performance · <year>-<MM>` with the month zero-padded, route `/reports/sla-performance`.
- `setData(null)` runs before the job, so the previous month's tables disappear while the new one loads.
- Passes `setError` to `useTrackedReport`, so a failure lands in the store's `error` and the page's `ErrorBanner`.
- `onSuccess` is the store's `setData` directly; no reshaping happens on the client.

## Cleanup Notes

- None noted.

## Source

[client/src/hooks/useSlaData.ts](../../../client/src/hooks/useSlaData.ts)
