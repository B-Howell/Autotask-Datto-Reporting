# FastAPI application entry point

> Builds the FastAPI app: CORS, a no-cache response middleware, the lifespan that opens the database and runs the sync scheduler, and the registration of every router.

## Purpose

`server/main.py` is wiring only. It owns nothing a report needs to be correct; it decides which routers are mounted, which headers every response carries, and when the background sync runs. Behaviour lives in `services/`, HTTP shape in `routers/`, and this module composes them into one process. The design decision is that the server is a single process with one in-process scheduler rather than a separate worker, because the workload is one MSP's monthly reporting.

## Interface

| Name | Description |
|---|---|
| `ROUTERS` | Tuple of router modules mounted in order: health, agencies, devices, office_windows, tickets, sla, utilization, patch_management, hdd_tickets, jobs, sync, manual_inputs, saved_reports. |
| `_sync_scheduler()` | Coroutine: sleeps 5 seconds, starts a sync if no successful sync has ever been recorded, then starts one every `settings.sync_interval_hours`. |
| `lifespan(_app)` | Async context manager: `sqlite.init_db()` on startup, creates the scheduler task, cancels it on shutdown. |
| `create_app()` | Returns the configured `FastAPI` instance. |
| `app` | Module-level instance that uvicorn imports as `main:app`. |

Running the file directly starts uvicorn on `0.0.0.0:8000` with `reload=True` and `timeout_graceful_shutdown=2`.

## Uses

- `fastapi`, `fastapi.middleware.cors.CORSMiddleware`, `asyncio`, `uvicorn` (only under `__main__`)
- [config](<Reporting Server - config.md>) for `cors_origins` and `sync_interval_hours`
- [sqlite repository](<repositories/Reporting Repository - sqlite.md>) for `init_db()`
- [snapshots repository](<repositories/Reporting Repository - snapshots.md>) for `last_sync_time()`
- [sync service](<services/Reporting Service - sync.md>) for `runner.start()`
- Every router module: [health](<routers/Reporting Router - health.md>), [agencies](<routers/Reporting Router - agencies.md>), [devices](<routers/Reporting Router - devices.md>), [office_windows](<routers/Reporting Router - office_windows.md>), [tickets](<routers/Reporting Router - tickets.md>), [sla](<routers/Reporting Router - sla.md>), [utilization](<routers/Reporting Router - utilization.md>), [patch_management](<routers/Reporting Router - patch_management.md>), [hdd_tickets](<routers/Reporting Router - hdd_tickets.md>), [jobs](<routers/Reporting Router - jobs.md>), [sync](<routers/Reporting Router - sync.md>), [manual_inputs](<routers/Reporting Router - manual_inputs.md>), [saved_reports](<routers/Reporting Router - saved_reports.md>)

## Used By

- Nothing imports this in application code; it is an entry point. uvicorn loads `main:app` from the container `CMD` in [server/Dockerfile](../../server/Dockerfile) and from the command in [docker-compose.demo.yml](../../docker-compose.demo.yml).
- [server/tests/test_routes.py](../../server/tests/test_routes.py) imports `app` and drives it with `TestClient`.

## Key Behavior

- Every response, including SSE streams and file downloads, gets `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`, `Pragma: no-cache` and `Expires: 0`, so no browser, proxy or service worker can serve stale report data. Covered by `test_responses_are_never_cacheable`.
- CORS allows the configured origins with credentials, all methods and all headers. In the Docker deployment nginx proxies `/api` on the same origin, so CORS only matters for the Vite dev server (default origin `http://localhost:3000`).
- The cold-start warm-up is gated on `snapshots.last_sync_time()` returning `None`, which means "no `sync_state` row with status ok". A database holding only failed syncs is treated as cold and warmed again.
- The interval loop sleeps first, so the first scheduled sync after boot is one full interval away (24 hours by default). `runner.start()` returns `False` and does nothing when a sync is already in flight, so overlapping runs cannot start from here.
- `lifespan` cancels the scheduler task on shutdown but does not wait for a sync in progress; the sync runs on a daemon thread owned by the sync service, so process exit ends it.
- The 2 second graceful shutdown window exists because a report request can run for minutes and uvicorn's default would wait for it, which held Ctrl+C in development.
- Router registration order is the order of `ROUTERS`; there are no path overlaps, so order only affects the OpenAPI listing.

## Cleanup Notes

- `create_app()` runs at import time to produce `app`, so tests run the real lifespan (database init and scheduler) under `TestClient`. That works only because `conftest.temp_db` points the sqlite repository at a temporary file before the client starts.
- `settings` is frozen at import, so changing `SYNC_INTERVAL_HOURS` needs a restart. Expected, but undocumented elsewhere.

## Source

[server/main.py](../../server/main.py)
