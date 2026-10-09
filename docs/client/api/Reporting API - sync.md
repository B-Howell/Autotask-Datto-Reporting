# Sync API

> Reads the status of the background snapshot sync and triggers a run, with the sync log stream URL for the Settings page.

## Purpose

`client/src/api/sync.ts` wraps the `/api/sync` routes used by the Data Sync section of Settings. The server can refresh every agency's snapshots on a schedule or on demand; this module lets the page show whether a run is in progress, how far along it is (`done` of `total`, the `current` agency), when it last finished, and start one.

## Interface

| Function | Server route | Parameters | Returns |
|---|---|---|---|
| `fetchSyncStatus` | `GET /api/sync/status` | none | `Promise<SyncStatus>` |
| `triggerSync` | `POST /api/sync` | none | `Promise<SyncTriggerResponse>` (`SyncStatus` plus `started`) |
| `SYNC_LOGS_URL` | `GET /api/sync/logs` | constant | The SSE URL string |

## Uses

- [client](<Reporting API - client.md>): `getJson`, `postJson`.
- [types](<Reporting API - types.md>): `SyncStatus`, `SyncTriggerResponse`.

## Used By

- [useSyncStatus](<../pages/settings/Reporting Settings - useSyncStatus.md>), via `syncApi` from [index](<Reporting API - index.md>). It is the only caller.

## Key Behavior

- `triggerSync` posts with no body, so no `Content-Type` header is sent.
- `started` is `false` when a sync was already running; the response still carries the current status so the page can render it without a second call.
- The sync is not a tracked report job: it does not go through `runReportJob` and does not appear in the status bar. The settings hook polls `fetchSyncStatus` and opens `SYNC_LOGS_URL` itself.
- Timestamps (`started_at`, `finished_at`, `last_synced_at`) are ISO strings or `null`, formatted on the page with `formatDateTime`.
- The server also exposes `GET /api/sync/state`, which this module does not call.

## Cleanup Notes

- None noted.

## Source

[client/src/api/sync.ts](../../../client/src/api/sync.ts)
