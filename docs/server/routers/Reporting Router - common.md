# Report route plumbing

> `run_report`: runs a report service call as the tracked job with a stream-bound logger, and maps cancellation to HTTP 499 and bad arguments to 400.

## Purpose

Every report route needs the same four things: a job record so the status bar can show the run, a logger bound to the report's named stream, a translation of `ReportCancelled` into a response the client recognises, and a translation of a `ValueError` (a malformed date, a reversed range) into a 400 with the reason. Putting that in one helper keeps each router to a label, a lambda and `run_report`. The decision to use 499 is deliberate: it is nginx's "client closed request", meaning the caller asked for the cancellation and has already stopped waiting.

## Interface

| Name | Description |
|---|---|
| `HTTP_CLIENT_CLOSED_REQUEST` | `499`. |
| `run_report(stream, label, run)` | Starts a job labelled `label`, builds `streams.report_logger(stream, job_id=...)`, calls `run(logger)` and returns its result. |

Error mapping, in order of the `except` clauses:

| Raised inside `run` | Job status | HTTP |
|---|---|---|
| `jobs.ReportCancelled` | `cancelled` | 499 `Report cancelled` |
| `ValueError` | `error` (message stored) | 400 with `str(exc)` as `detail` |
| any other `Exception` | `error` | re-raised; FastAPI answers 500 |

## Uses

- `fastapi.HTTPException`
- [jobs](<../core/Reporting Core - jobs.md>) and [streams](<../core/Reporting Core - streams.md>)

## Used By

- [devices](<Reporting Router - devices.md>), [hdd_tickets](<Reporting Router - hdd_tickets.md>), [office_windows](<Reporting Router - office_windows.md>), [patch_management](<Reporting Router - patch_management.md>), [sla](<Reporting Router - sla.md>), [tickets](<Reporting Router - tickets.md>), [utilization](<Reporting Router - utilization.md>)

## Key Behavior

- `jobs.start(label)` replaces whatever job record existed, so starting a second report while one runs orphans the first (see the jobs page). The label is what the status bar displays; routers build it from the report name and its scope, for example `Device Report · 1004`.
- The logger is created with `clear=True`, so the stream's backlog from the previous run of the same report type is dropped before the first line of the new run.
- On cancellation the handler appends `[DONE] Cancelled` to the buffer directly with `get_buffer(stream).append` and records it with `jobs.note`; using the tracked logger here would re-raise `ReportCancelled` from inside the handler. The job is then finished as cancelled and the 499 is raised `from None` so the traceback does not drag the cancellation exception along.
- A `ValueError` is the services' contract for bad input (`utilization.parse_date`, `_validated_range`, `quarter_range`). Pydantic validation errors never reach here; FastAPI answers 422 before the route body runs.
- Unexpected exceptions are recorded on the job (so the status bar shows the message) and re-raised unchanged; nothing is written to the snapshot cache because `get_cached_rows` only stores after a successful fetch.
- The routes are synchronous `def` functions, so FastAPI runs them on its threadpool and the report blocks that worker for its full duration; the SSE `/logs` routes are `async def` and share the event loop.

## Cleanup Notes

- Unexpected exceptions become a bare 500 with no `detail`; the message is only visible through the job record and stdout.

## Source

[server/routers/common.py](../../../server/routers/common.py)
