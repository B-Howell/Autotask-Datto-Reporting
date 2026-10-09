# reportJobStore

> The list of tracked report jobs behind the status bar: start, log, progress, finish, cancel, dismiss, and adoption of the server's current job record.

## Purpose

Reports are jobs, not requests. This store is the client-side job list that `RunningReportBar` renders: one row per report in flight or recently finished, with its log tail, structured progress, outcome and an abort handle. It is in the store layer. Jobs are added by `runReportJob` for runs started in this tab, and by `useServerJob` when it adopts a run the server reports (after a reload, or from another tab).

The key decision is that a job started here (`local: true`) trusts its own SSE stream, and the server poll only fills in whatever it is ahead on.

## Interface

Not created by the `reportDataStore` factory.

| Field / action | Description |
|---|---|
| `jobs: ReportJob[]` | Newest first, capped at `MAX_JOBS` (6). |
| `startJob(label, route?) => id` | Adds a running local job; drops rows for the same report name or the same run key. |
| `appendJobLog(id, line)` | Appends to the row's log, keeping the last `LOG_TAIL` (200) lines. |
| `setJobProgress(id, progress)` | Replaces the structured progress. |
| `finishJob(id, { error? })` | Marks done or error with `finishedAt`; a cancelled row is left as is. |
| `adoptServerJob(serverJob)` | Merges a `ServerJob` from the poll into the list (see below). |
| `cancelJob(id)` | Calls the row's `abort`, posts the server cancel, marks the row cancelled. |
| `setJobAbort(id, abort)` | Attaches the `AbortController` trigger. |
| `dismissJob(id)` | Removes the row; clears the server record if nothing is still running. |

`ReportJob` fields: `id`, `label`, `route`, `status` (`JobStatus`), `logs`, `progress`, `statusText`, `error`, `startedAt`, `finishedAt?`, `local`, `abort?`.

Exported helpers: `runKey(label)` (the text after the last ` · `, or the whole label), `reportName(label)` (the text before the first ` · `), `isAhead(next, prev)` (true when `next` has a higher step, or the same step and more done).

## Uses

- `zustand` (`create`)
- [jobs API](<../api/Reporting API - jobs.md>) for `cancelCurrentJob`, `dismissCurrentJob`
- [API types](<../api/Reporting API - types.md>) for `JobProgress`, `JobStatus`, `ServerJob`

## Used By

- [reportJob util](<../utils/Reporting Util - reportJob.md>), which drives the local lifecycle
- [useServerJob](<../hooks/Reporting Hook - useServerJob.md>), which calls `adoptServerJob`
- [RunningReportBar](<../components/Reporting Component - RunningReportBar.md>)

## Key Behavior

- Job ids are `${label}-${Date.now()}` locally; adopted server jobs keep the server's id.
- `startJob` keeps an existing row only if both its report name and its run key differ from the new label, so re-running a report replaces its row and the server's differently named twin (for example `Utilization · <range>` beside `Annual Utilization · <range>`).
- `adoptServerJob` has three cases: a running local twin (matched on `runKey`) receives only progress that is ahead and a changed status text; a row with the server's id is patched with status, progress, text, error and finish time; otherwise a new non-local row is inserted at the front. A finished local twin is left alone.
- Server timestamps are seconds and are multiplied by 1000.
- `finishJob` ignores a row already marked cancelled, because aborting the fetch also rejects the run with an error.
- `cancelJob` swallows abort and API errors; the row stays visible as cancelled so the user can see it happened.
- `dismissJob` only calls the server delete when no local row is still running, otherwise the next poll would re-adopt the row that was just dismissed.

## Cleanup Notes

- `runKey` matching is by trailing label segment only, so two different reports for the same agency (for example `Device Report · Acme` and `Patch Management · Acme`) share a run key: starting one removes the other's row in `startJob`, and `adoptServerJob` could patch the wrong twin if both were running. Only one report runs at a time in practice, which keeps this latent.
- Covered by `reportJobStore.test.ts`.

## Source

[client/src/store/reportJobStore.ts](../../../client/src/store/reportJobStore.ts)
