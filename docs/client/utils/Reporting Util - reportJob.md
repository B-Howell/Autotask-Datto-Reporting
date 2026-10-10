# reportJob util

> Runs a report fetch as one of the app's tracked jobs: registers it in the job store, subscribes to its SSE log stream, parses `[PROGRESS]` lines into the progress bar, batches log lines, and wires Cancel to an `AbortSignal`.

## Purpose

`client/src/utils/reportJob.ts` is the lifecycle every report shares, below the React layer. `useTrackedReport` calls `runReportJob` with a label, an optional logs URL and a `run(signal)` function; this module does the bookkeeping that the status bar depends on and guarantees that the log stream and the flush timer are closed however the run ends. It is a plain async function rather than a hook so stores and non-component code can use it and so it can be unit tested without rendering.

The design decision is the split between structured progress and human log lines on one stream: the server tags progress lines with a prefix so the client can route them to the progress bar immediately while the rest are batched for the log tail.

## Interface

| Export | Signature | Description |
|---|---|---|
| `PROGRESS_PREFIX` | `'[PROGRESS] '` | Must match `PROGRESS_PREFIX` in `server/core/progress.py`. |
| `ReportJobOptions<T>` | interface | `label`, `logsUrl?`, `run(signal)`, `onLogs?(lines)`, `route?`. |
| `runReportJob<T>` | `(options) => Promise<T>` | Runs the job and resolves with `run`'s result; rethrows its error. |
| `errorMessage` | `(err: unknown, fallback?: string) => string` | `err.message` for an `Error`, otherwise `String(err)`; when that text is empty, `fallback` (default `''`). |
| `isAbortError` | `(err: unknown) => boolean` | True for a `DOMException` named `AbortError`. |

## Uses

- [reportJobStore](<../store/Reporting Store - reportJobStore.md>): `startJob`, `appendJobLog`, `setJobProgress`, `finishJob`, `setJobAbort`, read once with `getState()`.
- [types](<../api/Reporting API - types.md>): `JobProgress`.
- The browser `EventSource` and `AbortController`.

## Used By

- [useTrackedReport](<../hooks/Reporting Hook - useTrackedReport.md>) wraps `runReportJob` for every report hook and uses `isAbortError` and `errorMessage`.
- [useReportingData](<../hooks/Reporting Hook - useReportingData.md>) and [SavedReportViewer](<../components/Reporting Component - SavedReportViewer.md>) use `errorMessage` for toasts.
- [saveReport util](<Reporting Util - saveReport.md>) uses `errorMessage`.
- [useSchedules](<../pages/scheduledReports/Reporting Scheduled Reports - useSchedules.md>), [RendererStatusChip](<../pages/scheduledReports/Reporting Scheduled Reports - RendererStatusChip.md>), [DeliveryTestButton](<../pages/scheduledReports/Reporting Scheduled Reports - DeliveryTestButton.md>), [useCredentials](<../pages/settings/Reporting Settings - useCredentials.md>) and [VendorCredentialsCard](<../pages/settings/Reporting Settings - VendorCredentialsCard.md>) pass `errorMessage` a fallback sentence for an error that carries no text.
- [client/src/utils/reportJob.test.ts](../../../client/src/utils/reportJob.test.ts) covers `errorMessage` and `isAbortError`.

## Key Behavior

- Order of operations: `startJob(label, route)` returns the job id; an `AbortController` is created and its `abort` registered with `setJobAbort` so the status bar's Cancel can call it; the flush timer starts; the `EventSource` opens if `logsUrl` is given; then `run(signal)` is awaited.
- `[PROGRESS]` parsing: on every SSE message, if `event.data` starts with the prefix, the remainder is `JSON.parse`d as a `JobProgress` (`phase`, `done`, `total`, `step`, `steps`) and applied at once with `setJobProgress`. A parse failure is swallowed; a bad progress line never fails a report. Any other line is pushed to the buffer.
- Log batching: the buffer is flushed every 200 ms (`FLUSH_MS`), each line appended to the store and the whole batch handed to `onLogs`. This keeps a report that logs hundreds of lines from forcing a React render per line.
- SSE lifecycle: the stream is opened before the fetch starts so no early lines are missed, `onerror` is a no-op because a dropped stream says nothing about the fetch (and `EventSource` reconnects on its own), and `source.close()` runs in `finally` so success, error and cancel all close it.
- Completion: on success `finishJob(jobId)`; on any throw `finishJob(jobId, { error })` then rethrow. An abort therefore also reaches `finishJob` with an error, but the store ignores it because `cancelJob` already marked the row cancelled.
- The `finally` block clears the timer and does one last `emit()` so lines that arrived in the final 200 ms are not lost.
- The server records only the current job; the client store is the source of truth for the status bar while the page is open.

## Cleanup Notes

- `PROGRESS_PREFIX` is exported but only used within this file; the export exists to document the contract with the server.
- `runReportJob` itself has no unit test; it is exercised through the report hooks.

## Source

[client/src/utils/reportJob.ts](../../../client/src/utils/reportJob.ts)
