# DataSyncSection

> The Settings card that starts a manual cache sync and shows its progress, last-synced time and live log.

## Purpose

`DataSyncSection` is the third card on the Settings page. Reports read from a local snapshot
cache that the server refreshes on a schedule (24 hours by default); this card lets a user
force that refresh now and watch it run. All state comes from `useSyncStatus`, so the
component is presentational: a button, a "Last synced" line, a progress bar while running, and
the log panel.

## Interface

`DataSyncSection` takes no props and is the module's default export.

The private `SyncProgress` component takes:

| Prop | Type | Required | Description |
|---|---|---|---|
| `status` | `SyncStatus` | yes | Drives the caption (`current`), the `done / total` counter and the bar. |

From `useSyncStatus` it consumes `status`, `logs` and `startSync`.

## Uses

- Material UI `Paper`, `Button`, `LinearProgress`, `CircularProgress` and the `Sync` icon.
- [useSyncStatus](<Reporting Settings - useSyncStatus.md>) for status polling and the log stream.
- [LogTailPanel](<../../components/Reporting Component - LogTailPanel.md>) to render the log tail.
- [dates util](<../../utils/Reporting Util - dates.md>) for `formatDateTime`.
- [API types](<../../api/Reporting API - types.md>) for `SyncStatus`.

## Used By

- [Settings page](<../Reporting Page - Settings.md>)

## Key Behavior

- The button is disabled while `status.running` is true; its icon becomes a 16px spinner and
  its label changes from "Sync now" to "Syncing".
- `formatWhen` renders `last_synced_at` through `formatDateTime`, or the word `never` when the
  server has not completed a sync.
- The progress bar is `determinate` only when `status.total` is non-zero; the value is
  `round(done / total * 100)`. With no total it falls back to indeterminate and hides the
  counter. The caption shows `status.current` or "Working" when the server has not named a
  step.
- `SyncProgress` renders only while running; `LogTailPanel` renders while running or once any
  log line has arrived, so the log of a finished sync stays visible until the page unmounts.
- The explanatory copy states the 24-hour refresh interval as a fixed fact; the real interval
  is the server's `SYNC_INTERVAL_HOURS` setting, which defaults to 24.

## Cleanup Notes

- The "every 24 hours" wording is hard-coded in the client and will be wrong if the server's
  `SYNC_INTERVAL_HOURS` is changed.
- `status.error` is never displayed, so a failed sync shows only "Last synced" unchanged and
  whatever the log said.

## Source

[client/src/pages/settings/DataSyncSection.tsx](../../../../client/src/pages/settings/DataSyncSection.tsx)
