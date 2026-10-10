# RunsTable

> The run history of one schedule: when each run started and finished, what triggered it, its status, its error and a link to the saved report it produced.

## Purpose

`RunsTable` is the panel that appears under the schedule list once a row is selected. It
exists so a failed run can be read in full (the error column wraps) and so the report a run
rendered can be reached: saving happens before delivery, so a run that failed to send still
leaves a file behind.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | yes | The panel heading, which the page builds from the preset name. |
| `runs` | `ScheduleRun[]` | yes | Rows as the server lists them, newest first. Empty shows "No runs yet." |

Columns: Started, Finished, Trigger (`schedule` or `manual`), Status (`RunStatusChip`),
Error (in the error colour, wrapping), Report (an "Open saved report" link when
`saved_report_id` is set).

## Uses

- [DataTable](<../../components/report/Reporting Report Component - DataTable.md>) and [RunStatusChip](<Reporting Scheduled Reports - RunStatusChip.md>).
- `react-router-dom` `Link` wrapped in the Material UI `Link`.
- [dates util](<../../utils/Reporting Util - dates.md>) for `formatDateTime`.

## Used By

- [ScheduledReports page](<../Reporting Page - ScheduledReports.md>)

## Key Behavior

- The report link goes to the Saved Reports page (`/reports/saved-reports`), which lists
  everything; there is no per-report deep link, so the user finds the file by its title and
  time.
- A run still in flight has no finish time and no error, so those cells are empty and the
  chip reads `running`.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/scheduledReports/RunsTable.tsx](../../../../client/src/pages/scheduledReports/RunsTable.tsx)
