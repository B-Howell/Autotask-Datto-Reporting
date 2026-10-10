# LogTailPanel

> A fixed-height monospace box showing the newest lines of a server log stream.

## Purpose

`LogTailPanel` is the log viewer under the Data Sync card and inside the runner log on the
Scheduled Reports page. It exists so a section can show server output without owning any
scrolling or truncation logic. A full sync or a run can produce many lines, so the panel
renders only a tail and relies on `overflow: auto` for the rest. It began life as
`SyncLogPanel` under `pages/settings` and moved to the shared component layer, with the tail
made configurable, when the runner log needed the same box.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `logs` | `string[]` | yes | Every line received so far, oldest first. |
| `tail` | `number` | no | How many of the newest lines to render. Default 40. |

Default export: `LogTailPanel`.

## Uses

- Material UI `Box` and `Typography`.

## Used By

- [DataSyncSection](<../pages/settings/Reporting Settings - DataSyncSection.md>) with the default tail.
- [RunnerLog](<../pages/scheduledReports/Reporting Scheduled Reports - RunnerLog.md>) with `tail` 200, matching the lines it keeps.

## Key Behavior

- With an empty array it shows "Waiting for logs" in `text.disabled`; both callers mount it
  only when a run is in flight or lines exist, so this appears in the gap between starting
  and the first server line.
- Otherwise it renders `logs.slice(-tail)`, each as a `body2` `Typography` in a monospace
  font and `text.secondary`.
- Lines are keyed by index within the slice. Because the slice window moves as lines arrive,
  React reuses nodes by position; this is harmless for static text but means keys are not
  stable identities.
- The container is `maxHeight: 260` with `overflow: auto`, `bgcolor: background.default` and
  rounded corners. It does not auto-scroll to the bottom.

## Cleanup Notes

- No auto-scroll: once more than the visible height of lines exist, the newest lines are
  below the fold until the user scrolls.

## Source

[client/src/components/LogTailPanel.tsx](../../../client/src/components/LogTailPanel.tsx)
