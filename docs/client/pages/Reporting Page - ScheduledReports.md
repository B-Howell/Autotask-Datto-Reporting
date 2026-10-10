# ScheduledReports page

> The `/scheduled` page: every monthly delivery on record, the runner's live log, and the run history of whichever schedule is selected.

## Purpose

`ScheduledReports` is rendered at `/scheduled` by the client's router and reached from the
sidebar and the home card named Scheduled Reports. It is a composition page: every piece of
state comes from `useSchedules`, and each visible region is its own component under
`pages/scheduledReports/`. The page fixes the order (pre-flight row, schedule table, runner
log, run history) and wires the delete confirmation.

Schedules are created elsewhere, from the Schedule button on a report page, so this page
has no create form. It is where a user checks that the renderer and the delivery flow are
reachable, runs a schedule by hand, switches one off, reads why a run failed and deletes
what is no longer wanted.

## Interface

`ScheduledReports` takes no props and is the module's default export. It renders, in order:

| Region | Component | Backed by |
|---|---|---|
| Pre-flight row | `RendererStatusChip` on the left, `DeliveryTestButton` on the right | the schedules API's health and test-delivery routes |
| Load error | `ErrorBanner` | `error` from `useSchedules` |
| Schedules | `SchedulesTable`, or a `LoadingRow` while loading | `schedules`, `status`, `selectedId` |
| Runner log | `RunnerLog` | `status.running` |
| Run history | `RunsTable`, only while a row is selected | `runs` |
| Delete confirmation | `ConfirmDialog`, busy while the delete runs | `removeTarget`, `removing` |

## Uses

- [ReportPage](<../components/report/Reporting Report Component - ReportPage.md>) for the centred title, [ErrorBanner](<../components/report/Reporting Report Component - ErrorBanner.md>) for a failed load and [LoadingRow](<../components/report/Reporting Report Component - LoadingRow.md>) until the first refresh settles.
- [ConfirmDialog](<../components/Reporting Component - ConfirmDialog.md>) for the delete question.
- [useSchedules](<scheduledReports/Reporting Scheduled Reports - useSchedules.md>) for every piece of state and every action.
- [SchedulesTable](<scheduledReports/Reporting Scheduled Reports - SchedulesTable.md>), [RunsTable](<scheduledReports/Reporting Scheduled Reports - RunsTable.md>), [RunnerLog](<scheduledReports/Reporting Scheduled Reports - RunnerLog.md>), [RendererStatusChip](<scheduledReports/Reporting Scheduled Reports - RendererStatusChip.md>) and [DeliveryTestButton](<scheduledReports/Reporting Scheduled Reports - DeliveryTestButton.md>).

## Used By

- [App](<../Reporting Client - App.md>) mounts it on the `/scheduled` route.
- [navigation](<../Reporting Client - navigation.md>) lists it last, after Saved Reports.

## Key Behavior

- `runningId` handed to the table is `status.schedule_id` while the runner is busy and null
  otherwise, so only the schedule actually in flight has its Run now button disabled. Pressing
  Run now on another schedule meanwhile is allowed and produces the server's 409 message as
  an error toast, which tells the user which schedule is running.
- The run history heading names the selected schedule's preset, falling back to
  `schedule <id>` when the preset row has been removed.
- The delete confirmation says what the server does: the schedule and its run history go,
  the preset and any saved reports stay. The page never deletes presets, because several
  schedules may share one.
- Dates are rendered through `formatDateTime`, which is `toLocaleString` in the browser's
  locale and time zone; the server stores UTC.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/ScheduledReports.tsx](../../../client/src/pages/ScheduledReports.tsx)
