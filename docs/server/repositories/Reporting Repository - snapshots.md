# Snapshots repository

> The read-through cache every report service goes through: look up the rows for a scope, fetch and store them on a miss, and record the outcome in `sync_state`.

## Purpose

A report service never decides for itself whether to call a vendor API. It describes its cache entry as a `Snapshot` (report type, table, scope) and hands `get_cached_rows` a `fetch_rows(logger)` callable; this module decides between the stored rows and a fresh fetch, performs the snapshot swap through the SQLite repository, and keeps `sync_state` current. It also holds the one branch that makes demo mode work: on a miss with `settings.demo_mode` set, the fetch callable is replaced by the demo generator for that report type and scope.

## Interface

| Name | Description |
|---|---|
| `Snapshot(report_type, table, scope)` | Frozen dataclass. `params_key` renders the scope as `k=v&k=v` in scope order for `sync_state`; `where` returns the SQL predicate and parameter tuple. |
| `read_rows(snapshot)` | `SELECT *` for the scope; no caching logic. |
| `get_cached_rows(snapshot, fetch_rows, refresh=False, logger=print)` | Returns `(rows, synced_at, was_cached)`. |
| `set_sync_state(report_type, params_key, last_synced_at, status="ok", error=None)` | Upsert into `sync_state`. |
| `list_sync_state()` | Every `sync_state` row ordered by report type and key. |
| `last_sync_time()` | `MAX(last_synced_at)` across rows with status `ok`; None when nothing has ever synced. |
| `device_office_coverage()` | Per (company_id, site_id) in `device_rows`: device count, count with a blank `office_version`, latest `synced_at`. |

## Uses

- [sqlite repository](<Reporting Repository - sqlite.md>) for `query`, `execute`, `replace_scope`, `iso_now`.
- [config](<../Reporting Server - config.md>) for `settings.demo_mode`.
- [demo data](<../demo/Reporting Demo - data.md>) via a lazy `from demo import fetch_for` inside `get_cached_rows`, only in demo mode.

## Used By

- Every report service: [devices](<../services/Reporting Service - devices.md>), [office_windows](<../services/Reporting Service - office_windows.md>), [patch_management](<../services/Reporting Service - patch_management.md>), [tickets](<../services/Reporting Service - tickets.md>), [sla](<../services/Reporting Service - sla.md>), [utilization](<../services/Reporting Service - utilization.md>), [hdd_tickets](<../services/Reporting Service - hdd_tickets.md>)
- [sync service](<../services/Reporting Service - sync.md>) (`last_sync_time` for the status payload)
- [sync router](<../routers/Reporting Router - sync.md>) (`list_sync_state`, `device_office_coverage`)
- [main](<../Reporting Server - main.md>) (`last_sync_time` to decide whether to sync on first start)
- `server/tests/test_snapshots.py` covers hit, miss, refresh, error and the empty-scope case.

## Key Behavior

- Hit path: when `refresh` is false and `read_rows` returns anything, the stored rows come back unchanged with `synced_at` taken from the first row and `was_cached=True`.
- Empty scope is still a hit: if no rows exist but `sync_state` has an `ok` row for this report type and `params_key`, the result is `([], last_synced_at, True)`. Without this an agency with no disk-space tickets would be refetched on every read.
- Miss or refresh: `now = iso_now()` is taken once; `fetch_rows(logger)` runs; every returned row gets `synced_at = now`; `replace_scope` swaps the scope in one transaction; `sync_state` is set to `ok`; the return is `(rows, now, False)`.
- Failure: any exception from the fetch or the swap writes `sync_state` with status `error` and the exception text, then re-raises. The previous snapshot stays in place because the swap never began (fetch failure) or rolled back (swap failure). This is what the settings page shows as a failing scope.
- The demo branch rebinds `fetch_rows` before the try block, so a demo fetch records `sync_state` exactly like a real one.
- `params_key` depends on scope key order, so a service must build its scope dict in a fixed order; all services use literal dicts, which preserve insertion order.
- `Snapshot.table` and the scope column names are interpolated into SQL unquoted; they come from service code, never from requests.

## Cleanup Notes

- None noted.

## Source

[server/repositories/snapshots.py](../../../server/repositories/snapshots.py)
