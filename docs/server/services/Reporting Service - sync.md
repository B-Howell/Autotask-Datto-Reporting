# Sync service

> The background refresh of every cached snapshot: builds the ordered step list, runs it with per-step error isolation, and owns the single in-flight sync and its status.

## Purpose

Reports are served from snapshots, so something has to keep the snapshots fresh. This module runs on the scheduler in `main.py` and on demand from the settings page. Current-state reports (patch, Office/Windows, devices, disk tickets) refresh per agency; period reports refresh only the period in progress, because a past month never changes and is cached once on first view.

## Interface

| Name | Description |
|---|---|
| `STREAM` | `"sync"`, the named log buffer the settings page follows. |
| `build_steps(now=None)` | `(label, callable)` pairs for one full sync, in run order. |
| `run_sync(logger=print, progress=None)` | Runs every step; `progress(done, total, label)` is called before and after each. |
| `SyncRunner` | `start()` launches a daemon thread and returns False when one is already running; `status()` returns the status dict plus `last_synced_at`. |
| `runner` | The module-level `SyncRunner` instance. |

Status dict keys: `running, started_at, finished_at, error, done, total, current, last_synced_at`.

## Uses

- Standard library `threading`, `datetime`.
- [streams core](<../core/Reporting Core - streams.md>) (`get_buffer`, `report_logger`)
- [snapshots repository](<../repositories/Reporting Repository - snapshots.md>) (`last_sync_time`) and [sqlite repository](<../repositories/Reporting Repository - sqlite.md>) (`iso_now`)
- [agencies](<Reporting Service - agencies.md>), [devices](<Reporting Service - devices.md>), [hdd_tickets](<Reporting Service - hdd_tickets.md>), [office_windows](<Reporting Service - office_windows.md>), [patch_management](<Reporting Service - patch_management.md>), [sla](<Reporting Service - sla.md>), [tickets](<Reporting Service - tickets.md>), [utilization](<Reporting Service - utilization.md>) through their `refresh_snapshot` functions.

## Used By

- [sync router](<../routers/Reporting Router - sync.md>) (`runner.start`, `runner.status`, `STREAM`)
- [main](<../Reporting Server - main.md>) (starts a sync when nothing has ever synced, then on the interval)
- [demo seed](<../demo/Reporting Demo - seed.md>) (`run_sync` with a console logger)

## Key Behavior

- Step order: for each agency, patch, office/windows, devices, hdd tickets; then SLA for the current month; then utilization for the current calendar quarter and the current fiscal year (from `utilization.quarter_range` and `fiscal_year_range`); then, for each agency, tickets for the current month. Labels are `<agency name>: <report>`, `SLA YYYY-MM`, `Utilization <period label>` and `<agency name>: tickets YYYY-MM`.
- Each step is a lambda with its arguments bound as defaults, called as `step(log=logger)`, so every `refresh_snapshot` receives the sync logger.
- Error isolation: a failing step is logged as `[WARN] <label> failed: <error>` and skipped; the snapshot layer has already recorded the error in `sync_state`, so the settings page can show which scope is failing. The loop itself never raises for a step.
- `SyncRunner.start` clears the sync log buffer before launching the thread, so each run's log starts clean; the per-run logger is created with `clear=False` for the same reason.
- Status updates happen under the runner's lock; `status()` copies the dict and adds `last_synced_at` from the database so the value survives restarts.
- `finished_at` is set in a `finally`, so a crash inside `run_sync` (not inside a step) still marks the run finished with `error` populated.

## Cleanup Notes

- `build_steps` reads `agencies.json` twice (once for the per-agency current-state steps, once for tickets); harmless but a single read would do.
- Period steps always target the month containing `now`, so a sync early in a new month refreshes a nearly empty month and the previous month keeps whatever snapshot it last had; tickets closed late in a month are only picked up by an explicit refresh.

## Source

[server/services/sync.py](../../../server/services/sync.py)
