# RunningReportBar

> The status bar pinned under the page content: one row per tracked report with progress, elapsed time, a way back to its page, and Cancel or Dismiss.

## Purpose

A report started on one page should keep reporting wherever the user goes next, and a reload should still show what the server is doing. This component renders `reportJobStore` and mounts `useServerJob` so the server's current-job record is folded in. It is in the component layer and is mounted once by `App`, below the routed page inside the main column.

## Interface

No props. Internally renders one `JobRow` per job with `onDismiss` and `onCancel` bound to the store.

## Uses

- `react`, `react-router-dom` (`useLocation`, `useNavigate`)
- `@mui/material` (`Paper`, `LinearProgress`, `Chip`, `Button`, `IconButton`, `Divider`, `Typography`)
- [useServerJob](<../hooks/Reporting Hook - useServerJob.md>)
- [reportJobStore](<../store/Reporting Store - reportJobStore.md>) and its `ReportJob` type
- [API types](<../api/Reporting API - types.md>) for `JobProgress`

## Used By

- [App](<../Reporting Client - App.md>)

## Key Behavior

- Renders nothing when there are no jobs; otherwise a square elevated `Paper` with a divider between rows.
- Chip: Running (primary), Cancelled (warning), Failed (error), Complete (success).
- Detail line: for an error the message; for cancelled a fixed "stopped before it finished, nothing was saved" sentence; otherwise `describe(job)`.
- `describe` while running: with progress and a total, `<phase>: <done> of <total>`; with progress and no total, `<phase>: <done> so far` or just the phase; before any progress, the latest log line, then the server status text, then "Starting". When finished, status text first, then the last log line, then "Finished".
- `humanize` strips a leading `[LEVEL]` tag and rewrites the server's `served from cache (synced_at=...)` line as "Already up to date, last synced <local date and time>", treating a timestamp without zone as UTC.
- Progress bar: indeterminate until the first phase; then each of `steps` phases owns an equal slice and the bar is `(step - 1) * slice + within * slice`, so it only moves forward even when a phase has no total.
- Elapsed time (`Ns` or `Nm Ss`) is computed at render, so a one-second tick state runs while anything is running and stops otherwise.
- "Go to report" shows for a finished, non-cancelled job with a route different from the current path.
- Cancel shows while running; Dismiss otherwise. Both call the store, which also talks to the server.

## Cleanup Notes

- None noted.

## Source

[client/src/components/RunningReportBar.tsx](../../../client/src/components/RunningReportBar.tsx)
