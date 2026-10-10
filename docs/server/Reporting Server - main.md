# FastAPI application entry point

> Builds the FastAPI app: CORS, a no-cache response middleware, the lifespan that opens the database, sweeps interrupted scheduled runs and runs the sync scheduler and the schedule ticker, and the registration of every router.

## Purpose

`server/main.py` is wiring only. It owns nothing a report needs to be correct; it decides which routers are mounted, which headers every response carries, and when the background sync and the schedule check run. Behaviour lives in `services/`, HTTP shape in `routers/`, and this module composes them into one process. The design decision is that the server is a single process with one in-process scheduler rather than a separate worker, because the workload is one MSP's monthly reporting.

## Interface

| Name | Description |
|---|---|
| `ROUTERS` | Tuple of router modules mounted in order: health, agencies, devices, office_windows, tickets, sla, utilization, patch_management, hdd_tickets, jobs, sync, manual_inputs, saved_reports, presets, schedules, tenant, credentials. |
| `_sync_scheduler()` | Coroutine: sleeps 5 seconds, starts a sync if no successful sync has ever been recorded, then starts one every `settings.sync_interval_hours`. A start the runner declines (one already running, or a vendor without credentials) is skipped until the next tick. |
| `_schedule_ticker()` | Coroutine: sleeps 10 seconds, then runs `schedule_runner.runner.tick()` through `asyncio.to_thread` every `settings.schedule_poll_seconds`, printing `[WARN] schedule tick failed: ...` and carrying on if a tick raises. |
| `lifespan(_app)` | Async context manager: `sqlite.init_db()` and `schedule_runner.sweep_interrupted()` on startup, creates the sync scheduler and the schedule ticker tasks, cancels both on shutdown and then waits up to one second for the schedule runner's thread. |
| `create_app()` | Returns the configured `FastAPI` instance, with [common](<routers/Reporting Router - common.md>)'s `validation_error_response` registered for `RequestValidationError`, so no 422 echoes the rejected input. |
| `app` | Module-level instance that uvicorn imports as `main:app`. |

Running the file directly starts uvicorn on `0.0.0.0:8000` with `reload=True` and `timeout_graceful_shutdown=2`.

## Uses

- `fastapi`, `fastapi.middleware.cors.CORSMiddleware`, `fastapi.exceptions.RequestValidationError`, `asyncio`, `uvicorn` (only under `__main__`)
- [routers/common](<routers/Reporting Router - common.md>) for `validation_error_response`
- [config](<Reporting Server - config.md>) for `cors_origins`, `sync_interval_hours` and `schedule_poll_seconds`
- [sqlite repository](<repositories/Reporting Repository - sqlite.md>) for `init_db()`
- [snapshots repository](<repositories/Reporting Repository - snapshots.md>) for `last_sync_time()`
- [sync service](<services/Reporting Service - sync.md>) for `runner.start()`
- [schedule_runner service](<services/Reporting Service - schedule_runner.md>) for `sweep_interrupted()` and `runner.tick()`
- Every router module: [health](<routers/Reporting Router - health.md>), [agencies](<routers/Reporting Router - agencies.md>), [devices](<routers/Reporting Router - devices.md>), [office_windows](<routers/Reporting Router - office_windows.md>), [tickets](<routers/Reporting Router - tickets.md>), [sla](<routers/Reporting Router - sla.md>), [utilization](<routers/Reporting Router - utilization.md>), [patch_management](<routers/Reporting Router - patch_management.md>), [hdd_tickets](<routers/Reporting Router - hdd_tickets.md>), [jobs](<routers/Reporting Router - jobs.md>), [sync](<routers/Reporting Router - sync.md>), [manual_inputs](<routers/Reporting Router - manual_inputs.md>), [saved_reports](<routers/Reporting Router - saved_reports.md>), [presets](<routers/Reporting Router - presets.md>), [schedules](<routers/Reporting Router - schedules.md>), [tenant](<routers/Reporting Router - tenant.md>), [credentials](<routers/Reporting Router - credentials.md>)

## Used By

- Nothing imports this in application code; it is an entry point. uvicorn loads `main:app` from the container `CMD` in [server/Dockerfile](../../server/Dockerfile) and from the command in [docker-compose.demo.yml](../../docker-compose.demo.yml).
- [server/tests/test_routes.py](../../server/tests/test_routes.py), [server/tests/test_schedule_routes.py](../../server/tests/test_schedule_routes.py), [server/tests/test_credentials_routes.py](../../server/tests/test_credentials_routes.py) and [server/tests/test_tenant.py](../../server/tests/test_tenant.py) import `app` and drive it with `TestClient`.

## Key Behavior

- Every response, including SSE streams and file downloads, gets `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`, `Pragma: no-cache` and `Expires: 0`, so no browser, proxy or service worker can serve stale report data. Covered by `test_responses_are_never_cacheable`.
- CORS allows the configured origins with credentials, all methods and all headers. In the Docker deployment nginx proxies `/api` on the same origin, so CORS only matters for the Vite dev server (default origin `http://localhost:3000`).
- The cold-start warm-up is gated on `snapshots.last_sync_time()` returning `None`, which means "no `sync_state` row with status ok". A database holding only failed syncs is treated as cold and warmed again.
- The interval loop sleeps first, so the first scheduled sync after boot is one full interval away (24 hours by default). `runner.start()` returns `False` and does nothing when a sync is already in flight, so overlapping runs cannot start from here. It also returns `False`, after writing `[WARN] Sync skipped: ...` to the sync stream, when a vendor has no credentials outside demo mode; a fresh install therefore boots cleanly, waits for the Settings page, and warms the cache on the first interval after the credentials are saved (or on the manual sync the page offers).
- `lifespan` cancels the scheduler task on shutdown but does not wait for a sync in progress; the sync runs on a daemon thread owned by the sync service, so process exit ends it.
- The schedule ticker checks for due schedules once a minute by default. Scheduled reports fire on a day and an hour, so that is plenty, and because the repository's `due()` compares `next_run_at <= now` a tick that comes late or is skipped does not skip a run. The tick is one SQLite query and at most a thread start, but it is still run through `asyncio.to_thread` rather than on the event loop: the sqlite repository serialises access with one connection and lock, and a snapshot swap during a sync can hold that lock for a while, which on the loop would stall every HTTP request for as long. The run itself happens on the runner's daemon thread. An exception from a tick is printed as a warning and the loop continues, so one bad poll cannot stop every later send.
- On shutdown, after cancelling both tasks, `lifespan` calls `schedule_runner.runner.join(timeout=1)`. That only helps a run on its last step, closing its row and stamping the schedule; a run still gathering or rendering is a daemon thread that process exit ends, and `sweep_interrupted()` on the next start records it. The second is kept short for the same reason the graceful-shutdown window is: a run can take minutes and must not hold a restart hostage.
- `sweep_interrupted()` runs before either task starts: a run the previous process was killed in the middle of has no one left to close its row, and its schedule was already advanced as the first step of that run, so the row is closed as `Interrupted by a restart` rather than run again.
- The 2 second graceful shutdown window exists because a report request can run for minutes and uvicorn's default would wait for it, which held Ctrl+C in development.
- Router registration order is the order of `ROUTERS`; there are no path overlaps, so order only affects the OpenAPI listing.

## Cleanup Notes

- `create_app()` runs at import time to produce `app`, so tests run the real lifespan (database init and scheduler) under `TestClient`. That works only because `conftest.temp_db` points the sqlite repository at a temporary file before the client starts.
- `settings` is frozen at import, so changing `SYNC_INTERVAL_HOURS` or `SCHEDULE_POLL_SECONDS` needs a restart. Expected, but undocumented elsewhere.

## Source

[server/main.py](../../server/main.py)
