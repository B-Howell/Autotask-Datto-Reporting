# SchedulesTable

> One row per schedule: preset, monthly slot, recipients, next and last run, and the run, enable and delete actions; a row click selects it.

## Purpose

`SchedulesTable` is the list on the Scheduled Reports page. It turns `ReportSchedule` rows
into a `DataTable` column spec and reports every user action through callbacks, so it knows
nothing about the API. It also owns the empty state, so the page does not branch on the row
count.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `schedules` | `ReportSchedule[]` | yes | Rows to show. Empty renders the empty state instead of a table. |
| `selectedId` | `number \| null` | yes | The highlighted row. |
| `runningId` | `number \| null` | yes | The schedule a run is in flight for; its Run now button is disabled. |
| `onSelect` | `(id) => void` | yes | A click anywhere on a row outside the action cell. |
| `onRunNow` | `(id) => void` | yes | The Run now button. |
| `onToggle` | `(id, enabled) => void` | yes | The switch, with its new value. |
| `onDelete` | `(id) => void` | yes | The delete icon; the caller confirms. |

Also exports `EMPTY_TEXT`, the empty-state sentence, so a test can assert it without
retyping it.

Columns:

| Column | Content |
|---|---|
| Name | The preset name, with the report label and agency name beneath in caption text (`Device inventory / Harbor Point Health`). `Preset missing` when the preset row no longer exists. |
| When | `Day <n> at <HH>:00`, the hour zero-padded. |
| Recipients | The To list, then `cc <list>` beneath when there is one. |
| Next run | `next_run_at` through `formatDateTime`. |
| Last run | `last_run_at` and a `RunStatusChip` for `last_status`, with `last_error` as the chip's tooltip. |
| Actions | Run now, the enable switch, the delete icon, right-aligned. |

## Uses

- [DataTable](<../../components/report/Reporting Report Component - DataTable.md>) with its `onRowClick` and `selectedKey` props, [EmptyState](<../../components/report/Reporting Report Component - EmptyState.md>) and `REPORT_LABELS` from [scheduleDraft](<../../components/report/Reporting Report Component - scheduleDraft.md>).
- [RunStatusChip](<Reporting Scheduled Reports - RunStatusChip.md>).
- [dates util](<../../utils/Reporting Util - dates.md>) for `formatDateTime`.
- Material UI `Paper`, `Button`, `Switch`, `IconButton`, the `PlayArrow` and `DeleteOutline` icons.

## Used By

- [ScheduledReports page](<../Reporting Page - ScheduledReports.md>)

## Key Behavior

- The action cell's wrapper stops click propagation, so pressing Run now, the switch or
  Delete never also selects the row.
- The switch carries an `aria-label` of `Enable schedule` or `Disable schedule`, naming the
  action it will take; it renders with the `switch` role.
- `whenLabel` is the client's rendering of the schedule's slot; the server stores the day and
  hour separately and interprets day 31 as the last day of the month, which this label does
  not restate.

## Cleanup Notes

- Covered by `SchedulesTable.test.tsx`.

## Source

[client/src/pages/scheduledReports/SchedulesTable.tsx](../../../../client/src/pages/scheduledReports/SchedulesTable.tsx)
