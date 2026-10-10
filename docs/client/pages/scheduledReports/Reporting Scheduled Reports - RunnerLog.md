# RunnerLog

> The runner's log stream in a dismissable panel: follows `/api/schedules/logs` for as long as the page is open and keeps the newest 200 lines.

## Purpose

`RunnerLog` lets the user watch a run as it happens and read the log of the run that just
finished. It opens one `EventSource` on mount rather than on Run now, so a run that the
scheduler started on its own, or one started from another tab, is captured as well.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `running` | `boolean` | yes | Whether the runner is busy; keeps the panel visible and the Dismiss button disabled. |

## Uses

- `scheduleLogsUrl` from the [schedules API](<../../api/Reporting API - schedules.md>).
- [LogTailPanel](<../../components/Reporting Component - LogTailPanel.md>) for the monospace box, with `tail` set to 200.
- Material UI `Paper`, `Button`, `Typography`.

## Used By

- [ScheduledReports page](<../Reporting Page - ScheduledReports.md>)

## Key Behavior

- Each message is appended and the buffer is cut to the newest 200 lines, the same cap the
  panel is asked to show, so nothing is held that cannot be seen.
- The panel renders when `running` is true, or when lines exist and the user has not
  dismissed them. Its heading reads "Run in progress" or "Last run log" accordingly.
- Dismiss clears the lines and hides the panel; a later run sets `dismissed` back to false
  through an effect on `running`, so the panel returns on its own.
- The server replays its whole buffer to a new subscriber, so opening the page after a run
  shows that run's log under "Last run log" without pressing anything. The buffer is cleared
  when the next run starts.
- The stream's `onerror` closes the source rather than letting the browser reconnect; the
  page has to be reopened to subscribe again. The same choice is made in `useSyncStatus`.

## Cleanup Notes

- A dropped stream is not surfaced; the panel simply stops growing.

## Source

[client/src/pages/scheduledReports/RunnerLog.tsx](../../../../client/src/pages/scheduledReports/RunnerLog.tsx)
