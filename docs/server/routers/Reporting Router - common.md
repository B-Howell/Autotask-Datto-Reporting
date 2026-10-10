# Route plumbing

> `run_report` runs a report service call as the tracked job with a stream-bound logger, mapping cancellation to HTTP 499, bad arguments to 400 and missing or unreadable vendor credentials to 503; `call_or_http_error` runs any other service call and maps its typed failures to 400, 404, 409 or 502.

## Purpose

Every report route needs the same four things: a job record so the status bar can show the run, a logger bound to the report's named stream, a translation of `ReportCancelled` into a response the client recognises, and a translation of a `ValueError` (a malformed date, a reversed range) into a 400 with the reason. Putting that in one helper keeps each router to a label, a lambda and `run_report`. The decision to use 499 is deliberate: it is nginx's "client closed request", meaning the caller asked for the cancellation and has already stopped waiting.

The scheduled-delivery routes run no job, but they share the other half of the problem: the services raise typed errors with a message meant for the user, and every route needs the same translation into a status code. `call_or_http_error` is that translation in one place, so the presets and schedules routers hold no `try` blocks of their own and a new typed error is mapped once.

## Interface

| Name | Description |
|---|---|
| `HTTP_CLIENT_CLOSED_REQUEST` | `499`. |
| `SECRETS_UNREADABLE` | `Stored credentials cannot be read; check APP_SECRET_KEY or the key file`, the 503 detail for a `SecretsError`. |
| `run_report(stream, label, run)` | Starts a job labelled `label`, builds `streams.report_logger(stream, job_id=...)`, calls `run(logger)` and returns its result. |
| `call_or_http_error(fn)` | Calls `fn()` and returns its result, answering each typed service failure with the status below and the exception text as `detail`. |

`run_report` error mapping, in order of the `except` clauses:

| Raised inside `run` | Job status | HTTP |
|---|---|---|
| `jobs.ReportCancelled` | `cancelled` | 499 `Report cancelled` |
| `ValueError` | `error` (message stored) | 400 with `str(exc)` as `detail` |
| `credentials.CredentialsMissing` | `error` | 503 with `str(exc)` as `detail` (`<Vendor> credentials are not configured; open Settings`) |
| `secrets.SecretsError` | `error` | 503 `SECRETS_UNREADABLE` |
| any other `Exception` | `error` | re-raised; FastAPI answers 500 |

The mapping lives in `_report_failure(exc)`, which answers `(status, detail)` or `None`; the one `except Exception` clause finishes the job with the error and either raises the mapped `HTTPException` or re-raises.

`call_or_http_error` mapping, in order of the `except` clauses:

| Raised inside `fn` | HTTP |
|---|---|
| `presets.InUseError` | 409 |
| `LookupError` | 404 |
| `ValueError` | 400 |
| `renderer.RenderError`, `delivery.DeliveryError` | 502 |
| any other `Exception` | re-raised; FastAPI answers 500 |

## Uses

- `fastapi.HTTPException`
- [jobs](<../core/Reporting Core - jobs.md>), [streams](<../core/Reporting Core - streams.md>) and [secrets](<../core/Reporting Core - secrets.md>) for `SecretsError`
- [credentials service](<../services/Reporting Service - credentials.md>) for `CredentialsMissing`
- [presets service](<../services/Reporting Service - presets.md>) for `InUseError`
- [scheduled_runs service](<../services/Reporting Service - scheduled_runs.md>) for `RenderError` and `DeliveryError`, which it re-exports from the integrations; the routers package imports only `core` and `services`

## Used By

- `run_report`: [devices](<Reporting Router - devices.md>), [hdd_tickets](<Reporting Router - hdd_tickets.md>), [office_windows](<Reporting Router - office_windows.md>), [patch_management](<Reporting Router - patch_management.md>), [sla](<Reporting Router - sla.md>), [tickets](<Reporting Router - tickets.md>), [utilization](<Reporting Router - utilization.md>)
- `call_or_http_error`: [presets](<Reporting Router - presets.md>), [schedules](<Reporting Router - schedules.md>)

## Key Behavior

- `jobs.start(label)` replaces whatever job record existed, so starting a second report while one runs orphans the first (see the jobs page). The label is what the status bar displays; routers build it from the report name and its scope, for example `Device Report · 1004`.
- The logger is created with `clear=True`, so the stream's backlog from the previous run of the same report type is dropped before the first line of the new run.
- On cancellation the handler appends `[DONE] Cancelled` to the buffer directly with `get_buffer(stream).append` and records it with `jobs.note`; using the tracked logger here would re-raise `ReportCancelled` from inside the handler. The job is then finished as cancelled and the 499 is raised `from None` so the traceback does not drag the cancellation exception along.
- A `ValueError` is the services' contract for bad input (`utilization.parse_date`, `_validated_range`, `quarter_range`). Pydantic validation errors never reach here; FastAPI answers 422 before the route body runs.
- A `CredentialsMissing` comes from the vendor client the report called, before any request left the process; the detail is the exception text so the page can tell the user which vendor to configure. A `SecretsError` means the stored values exist but the loaded key cannot read them; its own message names the key file path, which is replaced by `SECRETS_UNREADABLE` so the browser gets the remedy and not the path. Both are 503 rather than 500 because the server is healthy and the condition clears without a restart once the Settings page or the environment is fixed. Proven by `test_routes.py`.
- Unexpected exceptions are recorded on the job (so the status bar shows the message) and re-raised unchanged; nothing is written to the snapshot cache because `get_cached_rows` only stores after a successful fetch.
- `call_or_http_error` matches `InUseError` before `ValueError` because it is one: the presets service raises it when a schedule still renders the preset, and that is a conflict with existing state (409), not a malformed request (400). `LookupError` is the services' contract for an id that does not exist, so a stale page gets a 404 rather than a success it cannot tell from its own. The two integration errors are the renderer and the delivery flow being down or answering badly, which is a bad gateway from this server's point of view.
- The routes are synchronous `def` functions, so FastAPI runs them on its threadpool and the report blocks that worker for its full duration; the SSE `/logs` routes are `async def` and share the event loop.

## Cleanup Notes

- Unexpected exceptions become a bare 500 with no `detail`; the message is only visible through the job record and stdout.

## Source

[server/routers/common.py](../../../server/routers/common.py)
