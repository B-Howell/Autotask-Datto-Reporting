# useSyncStatus

> Hook that polls the server's sync status while a sync runs and streams the log of a sync started from this page.

## Purpose

`useSyncStatus` is the only stateful logic behind the Data Sync card. It wraps two endpoints
of the sync API: `GET /api/sync/status` (polled) and the `/api/sync/logs` Server-Sent Events
stream. It is a local hook rather than a store because sync status is only interesting on
the Settings page; the running-report bar handles report jobs separately.

The design decision is to poll only while `running` is true, so an idle Settings page makes
no background requests and the Sync button re-enables within one poll interval of completion.

## Interface

Returns `{ status, logs, startSync }`:

| Name | Type | Description |
|---|---|---|
| `status` | `SyncStatus` | Latest server status; starts as `IDLE_STATUS` (not running, zero counts, null timestamps). |
| `logs` | `string[]` | Lines received on the SSE stream since `startSync` was last called. |
| `startSync` | `() => Promise<void>` | Opens the log stream, posts the trigger, then refreshes status. |

`POLL_MS` is 1500.

## Uses

- `react` (`useState`, `useEffect`, `useRef`, `useCallback`) and the browser `EventSource`.
- [usePolling](<../../hooks/Reporting Hook - usePolling.md>) for the running-only poll.
- [sync API](<../../api/Reporting API - sync.md>) for `fetchSyncStatus`, `triggerSync` and
  `SYNC_LOGS_URL`.
- [API types](<../../api/Reporting API - types.md>) for `SyncStatus`.

## Used By

- [DataSyncSection](<Reporting Settings - DataSyncSection.md>)

## Key Behavior

- On mount it fetches status once. The cleanup closes any open `EventSource`.
- `usePolling(refresh, POLL_MS, status.running)` polls every 1.5 s only while running is
  true: the flip to running starts the poll with an immediate refresh, and the flip back
  clears it. If the page is opened while a scheduled sync is already in progress, the first
  status fetch sets `running` and polling begins, but no log stream is opened because the
  stream is tied to `startSync`.
- `refresh` swallows fetch errors so a transient failure does not blank the status.
- `startSync` clears `logs`, closes any previous stream, opens a new `EventSource` on
  `SYNC_LOGS_URL` before calling `triggerSync`, so the first lines are not missed. Each
  message appends `e.data`; an `onerror` closes the source (no reconnect).
- A failed trigger is logged to the console and the hook still refreshes status, so the UI
  reflects whatever the server believes.
- `startSync` is not memoised, so it is a new function each render; the section's button
  does not depend on referential stability.

## Cleanup Notes

- The log stream is never closed on completion, only on error or unmount; the browser keeps
  the SSE connection open until the page is left.
- A sync that was started elsewhere (scheduler or another tab) shows progress but no log.

## Source

[client/src/pages/settings/useSyncStatus.ts](../../../../client/src/pages/settings/useSyncStatus.ts)
