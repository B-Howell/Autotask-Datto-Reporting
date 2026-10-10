# RunStatusChip

> The outcome of a run as a small coloured chip, with the error text as a tooltip.

## Purpose

Both tables on the Scheduled Reports page show a run status: the schedule list shows the last
one and the run history shows every one. `RunStatusChip` maps the three server statuses to a
colour once so the two tables agree.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `status` | `'ok' \| 'error' \| 'running' \| null` | yes | `null` renders nothing, for a schedule that has never run. |
| `error` | `string \| null` | no | Wrapped as a tooltip around an `error` chip only. |

Colours: `ok` success, `error` error, `running` info; all outlined and small.

## Uses

- Material UI `Chip` and `Tooltip`.
- [API types](<../../api/Reporting API - types.md>) for `ScheduleRun['status']`.

## Used By

- [SchedulesTable](<Reporting Scheduled Reports - SchedulesTable.md>) for `last_status` with `last_error`.
- [RunsTable](<Reporting Scheduled Reports - RunsTable.md>) for each run, without a tooltip because the error has its own column there.

## Key Behavior

- The label is the raw status word, so the chip reads `ok`, `error` or `running`.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/scheduledReports/RunStatusChip.tsx](../../../../client/src/pages/scheduledReports/RunStatusChip.tsx)
