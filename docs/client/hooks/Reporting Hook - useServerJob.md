# useServerJob

> Polls the server's current-job record so the status bar shows a run already under way after a reload or in a second tab.

## Purpose

A report runs in a server worker thread and keeps going whether or not the browser that asked is still open. This hook keeps the client's job list in step with the server's one current-job record by polling it. It is in the hook layer and is mounted once, by `RunningReportBar`. Runs started in this tab are left to their own SSE stream; the poll only tops them up.

## Interface

`useServerJob(): void`. No arguments, no return value; the effect runs for the lifetime of the component that calls it.

## Uses

- `react` (`useEffect`)
- [jobs API](<../api/Reporting API - jobs.md>) for `fetchCurrentJob`
- [reportJobStore](<../store/Reporting Store - reportJobStore.md>) for `adoptServerJob`

## Used By

- [RunningReportBar](<../components/Reporting Component - RunningReportBar.md>)

## Key Behavior

- Polls immediately on mount, then every `POLL_MS` (2000 ms), and clears the interval on unmount.
- `fetchCurrentJob` returns null when the server answers `{}` (nothing running); null is not passed to the store.
- Errors are swallowed: an unreachable server is not something the status bar should report, and the next poll will try again.
- A `cancelled` flag guards against a response landing after unmount.
- How the adopted record merges with existing rows (local twin, same id, or new non-local row) is decided in `reportJobStore.adoptServerJob`, not here.
- Because the server keeps only one current job, this is also how a finished run started on another tab shows up as done here.

## Cleanup Notes

- None noted.

## Source

[client/src/hooks/useServerJob.ts](../../../client/src/hooks/useServerJob.ts)
