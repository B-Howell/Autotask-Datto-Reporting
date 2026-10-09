# SyncLogPanel

> A fixed-height monospace box showing the last 40 lines of the sync log.

## Purpose

`SyncLogPanel` is the log viewer under the Data Sync card. It exists so the sync section can
show server output without owning any scrolling or truncation logic. The log for a full sync
can run to hundreds of lines, so the panel renders only a tail and relies on `overflow: auto`
for the rest.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `logs` | `string[]` | yes | Every line received so far, oldest first. |

Default export: `SyncLogPanel`. `TAIL` (40) is a module constant, not configurable.

## Uses

- Material UI `Box` and `Typography`.

## Used By

- [DataSyncSection](<Reporting Settings - DataSyncSection.md>)

## Key Behavior

- With an empty array it shows "Waiting for logs" in `text.disabled`; the parent only mounts
  it when a sync is running or lines exist, so this appears in the gap between pressing Sync
  and the first server line.
- Otherwise it renders `logs.slice(-TAIL)`, that is the newest 40 lines, each as a `body2`
  `Typography` in a monospace font and `text.secondary`.
- Lines are keyed by index within the slice. Because the slice window moves as lines arrive,
  React reuses nodes by position; this is harmless for static text but means keys are not
  stable identities.
- The container is `maxHeight: 260` with `overflow: auto`, `bgcolor: background.default` and
  rounded corners. It does not auto-scroll to the bottom.

## Cleanup Notes

- No auto-scroll: once more than the visible height of lines exist, the newest lines are
  below the fold until the user scrolls.

## Source

[client/src/pages/settings/SyncLogPanel.tsx](../../../../client/src/pages/settings/SyncLogPanel.tsx)
