# useTrackedReport

> The lifecycle every report hook shares: mark loading, clear the log and error, run the fetch as a tracked job, store the outcome, and never treat a cancellation as a failure.

## Purpose

Each report hook owns a store with `setLoading` and optionally `setLogs` and `setError`, and each needs to run its fetch as one of the app's tracked jobs so the status bar follows it. This hook takes those setters once and returns a `runReport` function that wraps `runReportJob` with the bookkeeping, so the per-report hooks only describe the fetch and what to do with the result. It is in the hook layer, between the store and the per-report hooks.

The design decision is that the status-bar mechanics (job row, SSE stream, abort, cancel) live in `runReportJob`, and this hook adds only the page-side state transitions.

## Interface

`useTrackedReport(target: TrackedReportTarget)` returns a memoised `async <T>(run: TrackedReportRun<T>) => Promise<void>`.

| Type | Fields |
|---|---|
| `TrackedReportTarget` | `setLoading(boolean)`, optional `setLogs(prev => next)`, optional `setError(string \| null)`. |
| `TrackedReportRun<T>` | Everything in `ReportJobOptions<T>` except `onLogs` (`label`, `logsUrl?`, `run(signal)`, `route?`), plus `onSuccess(data)` and optional `onFailure()`. |

## Uses

- `react` (`useCallback`)
- [reportJob util](<../utils/Reporting Util - reportJob.md>) for `runReportJob`, `errorMessage`, `isAbortError`, `ReportJobOptions`

## Used By

- [useHddTicketsData](<Reporting Hook - useHddTicketsData.md>)
- [useOfficeWindowsData](<Reporting Hook - useOfficeWindowsData.md>)
- [usePatchManagementData](<Reporting Hook - usePatchManagementData.md>)
- [useReportingData](<Reporting Hook - useReportingData.md>)
- [useSlaData](<Reporting Hook - useSlaData.md>)
- [useTicketData](<Reporting Hook - useTicketData.md>)
- [useUtilizationData](<Reporting Hook - useUtilizationData.md>)

## Key Behavior

The full job lifecycle, in order, for one `runReport` call:

- Page state: `setLoading(true)`, `setLogs(() => [])` if provided, `setError(null)` if provided.
- Register: `runReportJob` calls `reportJobStore.startJob(label, route)`, which adds a running `local` row to the status bar and returns its id. Starting the same report again replaces its old row.
- Abort signal: an `AbortController` is created and its `abort` is attached to the row with `setJobAbort`, so the bar's Cancel button can stop the request. The signal is passed to `run(signal)`; every API call in the run must forward it.
- SSE subscribe: when `logsUrl` is given, an `EventSource` is opened on it. Messages prefixed `[PROGRESS] ` are parsed as JSON `JobProgress` and applied immediately with `setJobProgress`; every other line is buffered and flushed every 200 ms to both `appendJobLog` (row log tail) and this hook's `onLogs`, which appends to the page store through `setLogs(prev => [...prev, ...lines])`. A stream error is ignored, because a dropped stream says nothing about whether the server is still working.
- Cancel: the bar's Cancel calls `reportJobStore.cancelJob`, which fires the abort, posts `/api/jobs/current/cancel` so the server's cooperative cancel flag is set, and marks the row cancelled. The fetch then rejects with an `AbortError`.
- Success: `finishJob(id)` marks the row done, the timer is cleared, remaining log lines are flushed, the `EventSource` is closed, then `onSuccess(data)` stores the result.
- Failure: `finishJob(id, { error })` marks the row failed (unless it is already cancelled), the same teardown runs, and the error is rethrown. This hook then checks `isAbortError`: an abort returns silently with nothing else changed; any other error is logged to the console, `setError(errorMessage(err))` is called if provided, and `onFailure()` runs so the hook can clear stale data.
- Always: `setLoading(false)` in `finally`, including after a cancel.
- Reload recovery: this hook holds nothing across a reload. The server keeps a record of the current run (`/api/jobs/current`), and `useServerJob` polls it every two seconds and calls `adoptServerJob`, so after a reload the status bar shows the run with the server's progress and status text, marked non-local. The result of that run is not delivered to the page; the user regenerates, and the server answers from its snapshot cache.

Other notes:

- The returned function is stable while the three setters are stable; callers take setters from `store.getState()` so they are.
- `onLogs` is only wired when `setLogs` is provided; hooks without a log panel (tickets) still get the row log tail in the status bar.

## Cleanup Notes

- None noted.

## Source

[client/src/hooks/useTrackedReport.ts](../../../client/src/hooks/useTrackedReport.ts)
