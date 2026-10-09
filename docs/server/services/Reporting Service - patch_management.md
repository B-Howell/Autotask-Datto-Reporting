# Patch management service

> Workstation patch status for one Datto site: a status summary for the donut and the device list worst first, cached per site in `patch_rows`.

## Purpose

This mirrors Datto's own Patch Management report, which covers desktops and laptops only. The fetch is a single paged listing of the site's devices filtered to live workstations; the aggregate groups them by patch status. It is the simplest report and the one the architecture notes walk through as the example request.

## Interface

| Name | Description |
|---|---|
| `snapshot(site_uid)` | `Snapshot("patch", "patch_rows", {site_id})`. |
| `fetch_rows(site_uid, logger)` | One row per live workstation, sorted by hostname. |
| `aggregate(rows)` | `{summary, devices, device_count}`. |
| `get_patch_report(site_uid, logger, refresh)` | Read-through; adds `synced_at`. |
| `refresh_snapshot(site_uid, logger)` | Fetch and store, ignoring the cache. |
| `PATCH_STATUS_LABELS` | Datto status enum to label, in legend order: FullyPatched, ApprovedPending, InstallError, RebootRequired, NoData, NoPolicy. |
| `PATCH_PHASES` | Collecting devices from Datto, Building the report. |

## Uses

- [progress core](<../core/Reporting Core - progress.md>)
- [datto integration](<../integrations/Reporting Integration - datto.md>) (`site_devices`)
- [snapshots repository](<../repositories/Reporting Repository - snapshots.md>)
- [common helpers](<Reporting Service - common.md>) (`strip_domain`)

## Used By

- [patch_management router](<../routers/Reporting Router - patch_management.md>)
- [sync service](<Reporting Service - sync.md>)
- [demo data](<../demo/Reporting Demo - data.md>) imports `PATCH_PHASES`.
- `server/tests/test_snapshots.py` uses the `patch` report type as its fixture.

## Key Behavior

- Row shape (also the table columns): `hostname, description, last_user, last_reboot, installed, approved_pending, not_approved, status, status_label`. Counts default to 0 and a missing `patchStatus` becomes `NoData`; `last_user` has its domain stripped at fetch time.
- Workstation filter: devices flagged `suspended` or `deleted` are dropped silently; devices whose `deviceType.category` (lower-cased) is not one of desktops, laptops, workstations or their singular forms are dropped and counted per category in one `[INFO]` line.
- Phase 1 progress is driven by the paged listing's `on_page` callback with an unknown total, so the bar holds at the phase boundary rather than inventing a percentage.
- `aggregate` builds `summary` as one entry per `PATCH_STATUS_LABELS` row in legend order with its count (zero included), and sorts `devices` by severity (the reverse of legend order, so NoPolicy and NoData come first and FullyPatched last; unknown statuses sort after everything) then by upper-cased hostname.
- `strip_domain` is applied again on read so snapshots stored before the domain was stripped display correctly without a resync.

## Cleanup Notes

- The fetch sorts rows by hostname and the aggregate re-sorts by severity, so the fetch-time sort only affects the stored order.

## Source

[server/services/patch_management.py](../../../server/services/patch_management.py)
