# useSchedules

> The state behind the Scheduled Reports page: the schedule list, the runner status and the selected schedule's runs, refreshed together on a timer that speeds up while a run is in flight.

## Purpose

`useSchedules` is the only stateful logic on the page. It owns three server-backed values
(schedules, runner status, runs of the selected schedule) and the four actions the table
offers (run now, enable or disable, delete, select). The page and the table stay
presentational.

The refresh cadence is the design decision: one `refresh` fetches all three values with a
single `Promise.all`, and the interval it runs on is 5 seconds while `status.running` is true
and 30 seconds otherwise. A run takes a few seconds, so the row's last-run column, the run
history and the runner status all settle within one short poll of the run ending, without
polling hard when nothing is happening.

## Interface

```ts
const {
  schedules, status, loading, error,   // list, {running, schedule_id}, first-load flag, load failure text
  selectedId, runs,                    // the expanded schedule and its runs, newest first
  removeTarget, removing,              // the schedule awaiting delete confirmation, and whether the delete is in flight
  select, toggle, askRemove, cancelRemove, remove, runNow,
} = useSchedules();
```

| Action | Effect |
|---|---|
| `select(id)` | Toggles `selectedId`; clears `runs` so the old history never shows under the new heading. The next refresh loads `fetchRuns(id)`. |
| `toggle(id, enabled)` | `updateSchedule(id, { enabled })`; the returned row replaces the old one. Failure toasts the message. |
| `askRemove(id)` / `cancelRemove()` | Set or clear `removeTarget` for the confirmation dialog. |
| `remove(id)` | `deleteSchedule(id)`, drops the row, clears the selection if it was selected, toasts "Schedule deleted; its preset is kept". |
| `runNow(id)` | `runNow(id)`; on 202 toasts "Run started" and marks the status running at once, which rebuilds the poll at the fast cadence and refreshes immediately; on rejection toasts the server's `detail`, which for a 409 names the schedule already in flight. |

## Uses

- [schedules API](<../../api/Reporting API - schedules.md>): `fetchSchedules`, `fetchRunnerStatus`, `fetchRuns`, `updateSchedule`, `deleteSchedule`, `runNow`.
- [API types](<../../api/Reporting API - types.md>) for `ReportSchedule`, `RunnerStatus` and `ScheduleRun`.
- [usePolling](<../../hooks/Reporting Hook - usePolling.md>) for the refresh timer.
- [toastStore](<../../store/Reporting Store - toastStore.md>) for every outcome message.
- [reportJob util](<../../utils/Reporting Util - reportJob.md>) for `errorMessage`; each failure toast and the load error pass it a fallback sentence (`Schedules could not be loaded`, `The schedule could not be updated`, `The schedule could not be deleted`, `The run could not start`) for an error that carries no text.

## Used By

- [ScheduledReports page](<../Reporting Page - ScheduledReports.md>)

## Key Behavior

- `refresh` is memoised on `selectedId` and handed to `usePolling` with the cadence for the
  current `status.running`; changing the selection recreates `refresh`, and a run starting or
  ending changes the interval, and either restarts the poll with an immediate call.
- A failed refresh sets `error` to the message and leaves the previous rows in place; the
  page shows the banner above whatever it last had. The next successful refresh clears it.
- `loading` is true only until the first refresh settles, so later polls never blank the table.
- Every refresh takes a ticket from a counter; a response that arrives after a newer refresh
  started, or after `select` bumped the counter, is discarded. This keeps a slow fetch of the
  previous selection's runs from landing under the new heading, and keeps polls in order.
- `removing` is true while `deleteSchedule` is in flight; the page passes it to the
  confirmation dialog as `busy` so a second click or a backdrop close cannot interrupt it.
- The preset behind a deleted schedule is deliberately left alone: presets are reusable and
  the server refuses to delete one that another schedule still renders, so cleanup is a
  separate, explicit action rather than a side effect here.
- Setting `status` to running straight after a 202 is optimistic; the refresh the status flip
  triggers through `usePolling` replaces it with the server's answer, which is already `running: true` by then
  because the runner starts the thread before the route returns.

## Cleanup Notes

- Covered by `useSchedules.test.ts`.

## Source

[client/src/pages/scheduledReports/useSchedules.ts](../../../../client/src/pages/scheduledReports/useSchedules.ts)
