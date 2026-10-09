# Named log streams

> Keeps one `LogBuffer` per report type, builds the SSE response that follows a buffer, and builds the per-run logger that writes to stdout, the buffer and the job record.

## Purpose

A report writes human log lines and `[PROGRESS]` lines to its stream while it runs; the page that started it, or any page via the status bar, follows the stream with `EventSource`. Each report type has its own buffer so two reports running at once never interleave their output. This module is the registry of those buffers and the only place an SSE response or a report logger is constructed.

## Interface

| Name | Description |
|---|---|
| `get_buffer(name)` | Returns the `LogBuffer` for `name`, creating it on first use. Names in use: `devices`, `office-windows`, `tickets`, `sla`, `utilization`, `patch`, `hdd`, `sync`, `schedules`. |
| `sse_response(name)` | An `EventSourceResponse` whose generator polls the named buffer every 0.25 s and yields each new line until the client disconnects. |
| `report_logger(name, job_id=None, clear=True)` | Returns a `log(message)` callable. With `clear=True` the buffer is emptied first. With a `job_id` each line is also recorded on the job and the cancel flag is checked. |

## Uses

- `sse_starlette.sse.EventSourceResponse`, `asyncio`
- [log_buffer](<Reporting Core - log_buffer.md>)
- [jobs](<Reporting Core - jobs.md>) (`note`, `raise_if_cancelled`)

## Used By

- [routers common](<../routers/Reporting Router - common.md>) (`report_logger` with a job id, `get_buffer` to append the cancelled marker)
- Routers that expose a `/logs` route: [devices](<../routers/Reporting Router - devices.md>), [hdd_tickets](<../routers/Reporting Router - hdd_tickets.md>), [office_windows](<../routers/Reporting Router - office_windows.md>), [patch_management](<../routers/Reporting Router - patch_management.md>), [schedules](<../routers/Reporting Router - schedules.md>), [sla](<../routers/Reporting Router - sla.md>), [sync](<../routers/Reporting Router - sync.md>), [utilization](<../routers/Reporting Router - utilization.md>)
- [sync service](<../services/Reporting Service - sync.md>) (`get_buffer(STREAM).clear()` then `report_logger(STREAM, clear=False)` on its worker thread)
- [schedule_runner service](<../services/Reporting Service - schedule_runner.md>) (`report_logger("schedules", clear=True)` once per batch of scheduled runs, on its worker thread)

## Key Behavior

- The registry `_buffers` is a plain module dict; buffers are never removed. Creation is not locked, but the first call for each name happens on the request thread that starts the report, and a duplicate creation would only lose lines written in the same instant.
- `sse_response` starts its cursor at 0, so a new subscriber first receives the entire retained window (up to 1000 lines). The generator sleeps before each poll, yields lines one per SSE event, and ends only when the connection drops (`EventSourceResponse` cancels the generator).
- Lines are yielded raw. `EventSourceResponse` frames each item as `data: <line>` itself; wrapping here as well once produced `data: data: ...` on the wire.
- `report_logger` prints every line to stdout as well, so container logs carry the same text the browser sees.
- Order inside `log` matters: the line is appended to the buffer and recorded on the job before `raise_if_cancelled` runs, so the last line a cancelled report wrote is visible, and `ReportCancelled` unwinds from inside the report's own code.
- `clear=True` (the default used by `run_report`) wipes the previous run's backlog without rewinding cursors, so a page still following the old run simply starts seeing the new one.
- `[DONE] Cancelled` is appended by the routers' error handler through `get_buffer`, not through the logger, because the logger would raise `ReportCancelled` again inside the handler.

## Cleanup Notes

- The poll interval (0.25 s) means a line can wait up to that long before leaving the server; acceptable for a log tail, but the comment in the architecture notes that says "four times a second" is the only place the figure is documented.

## Source

[server/core/streams.py](../../../server/core/streams.py)
