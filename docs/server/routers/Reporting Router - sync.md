# Sync router

> Start the background sync on demand, read its live status and last outcome per report, and follow its log stream.

## Purpose

The sync refreshes every report's cached snapshot from the live APIs, on the scheduler and from the settings page. This router is the settings page's view of it: a trigger, a status poll, the per-report `sync_state` table (where a refresh that keeps failing becomes visible), and the SSE stream of the sync log. The runner itself, which owns the one sync allowed in flight, lives in the sync service.

## Interface

| Method | Path | Query/body | Returns | Error mapping |
|---|---|---|---|---|
| POST | `/api/sync` | none | `{started: bool, reason: "running" or "credentials" or null, running, started_at, finished_at, error, done, total, current, last_synced_at}` | none |
| GET | `/api/sync/status` | none | the same status object without `started` and `reason` | none |
| GET | `/api/sync/state` | none | `{sync_state: [{report_type, params_key, last_synced_at, status, error}], device_office_coverage: [{company_id, site_id, devices, blank_office, synced_at}]}` | none |
| GET | `/api/sync/logs` | none | SSE stream of the `sync` buffer | none |

The sync is not a report job: it does not use `run_report`, has no job record, and cannot be cancelled from the status bar.

## Uses

- `fastapi.APIRouter`
- [streams](<../core/Reporting Core - streams.md>) (`sse_response`)
- [snapshots repository](<../repositories/Reporting Repository - snapshots.md>) (`list_sync_state`, `device_office_coverage`)
- [sync service](<../services/Reporting Service - sync.md>) (`STREAM`, `runner`)

## Used By

- [main](<../Reporting Server - main.md>) mounts `router`
- [client sync API](<../../client/api/Reporting API - sync.md>)

## Key Behavior

- POST answers `started: false` with the current status when a sync is already running (`reason: "running"`), and likewise when a vendor has no credentials outside demo mode (`reason: "credentials"`; the runner also writes `[WARN] Sync skipped: ...` to the sync stream, so `/logs` shows which vendor); it never queues a second one. `reason` is `null` when the sync started, so the key is always present. The route reads the runner's `StartOutcome` and passes its two fields through; the Settings page turns the reason into a toast. The same runner is what the scheduler in `main.py` calls, so a manual trigger and a scheduled one cannot overlap.
- Starting a sync clears the `sync` buffer, then logs on a daemon thread with `clear=False`; `/logs` followers see `[INFO] Sync starting: N steps`, one `[INFO] (i/N) label` per step, `[WARN]` for a step that failed, and `[DONE] Sync complete`.
- `done`, `total` and `current` in the status come from the runner's progress callback and advance per step; `last_synced_at` is read from `sync_state` on every status call, so it persists across restarts while the rest of the status does not.
- A step that raises is logged and skipped; `error` in the status is only set if the sync loop itself fails.
- `sync_state` rows are per report type and scope (`params_key` such as `company_id=1004&site_id=ab`), with `status` `ok` or `error` and the error message, ordered by report type then key.
- `device_office_coverage` counts, per device scope, how many stored rows have a blank Office version, so a wholesale audit failure is a number on the settings page rather than a silently empty column.

## Cleanup Notes

- The status object has no field for the step list length before the sync starts, so the first poll after POST may show `total: 0` until `build_steps` has run.

## Source

[server/routers/sync.py](../../../server/routers/sync.py)
