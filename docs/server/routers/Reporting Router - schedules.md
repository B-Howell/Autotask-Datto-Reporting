# Schedules router

> Manage schedules and their run history, start one now, follow the run log, check the runner's status, and test the renderer and the delivery flow before the first scheduled send.

## Purpose

The scheduled reports page needs two things: the schedule rows themselves, and a view of what the scheduler is doing with them. This router serves both. The rows go through the [schedules service](<../services/Reporting Service - schedules.md>), which validates them and computes `next_run_at`; every schedule comes back joined with its preset so the page can print the report name without a second request. The operational routes read the [schedule_runner service](<../services/Reporting Service - schedule_runner.md>) (status, run-now, the `schedules` log stream), the run rows in the [schedules repository](<../repositories/Reporting Repository - schedules.md>), and the two integrations a run depends on, so a misconfigured renderer URL or an unset webhook shows up on the page today rather than as a failed run on the first of the month.

## Interface

| Method | Path | Query/body | Returns | Error mapping |
|---|---|---|---|---|
| GET | `/api/schedules` | none | list of schedule rows, each with `preset` (the preset row or `null`), ordered by id | none |
| POST | `/api/schedules` | JSON `ScheduleBody`: `preset_id`, `day_of_month`, `hour`, `recipients_to`, `recipients_cc`, `subject`, `body`, `enabled`; all optional in the schema, the service requires `preset_id`, `day_of_month`, `recipients_to` and `subject` | 201 with the stored row joined with its preset; `next_run_at` is set when enabled | 400 with the service's message (`No such preset`, `day_of_month must be between 1 and 31`, `At least one recipient is required`, `Not an email address: ...`, `A subject is required`) |
| GET | `/api/schedules/runs` | `limit: int` 1 to 500, default 50 | the newest run rows across every schedule (`id, schedule_id, trigger, started_at, finished_at, status, error, saved_report_id`) | none |
| GET | `/api/schedules/status` | none | `{running: bool, schedule_id: int or null}` from the runner | none |
| GET | `/api/schedules/logs` | none | SSE stream of the `schedules` buffer | none |
| GET | `/api/schedules/renderer-health` | none | the renderer's `/health` body (`ok`, `reportTypes`) | 502 with the `RenderError` text when the renderer is down or answers badly |
| POST | `/api/schedules/test-delivery` | JSON `{to: [address, ...]}`, at least one | `{sent: true}` after the flow accepted a message with subject `Reporting: delivery test`, a one-line body and no attachment | 502 with the `DeliveryError` text (`DELIVERY_WEBHOOK_URL is not set...`, `Delivery flow unreachable at <host>: ...`, `Delivery flow returned <status>: ...`); 422 when `to` is missing or empty |
| PUT | `/api/schedules/{schedule_id}` | path `schedule_id: int`; JSON `ScheduleBody` with only the fields to change | the stored row after the change, joined with its preset; `next_run_at` is recomputed, or `null` when disabled | 404 `No such schedule`; 400 when the merged row fails validation |
| DELETE | `/api/schedules/{schedule_id}` | path `schedule_id: int` | `{deleted: true}` | 404 `No such schedule` |
| GET | `/api/schedules/{schedule_id}/runs` | path `schedule_id: int` | that schedule's runs, newest first, at most 50 | 404 `No such schedule` |
| POST | `/api/schedules/{schedule_id}/run` | path `schedule_id: int` | 202 `{started: true}`; the run proceeds on the runner's thread with trigger `manual` | 404 `No such schedule`; 409 `A run of schedule <id> is already in flight` (or `of another schedule` when the runner has no id to report) |

`ScheduleBody` and `TestDelivery` are Pydantic models. `ScheduleBody` has every field optional and is serialized with `exclude_unset=True`, so `{"enabled": false}` reaches the service as exactly that and the service merges it over the stored row. `day_of_month` and `hour` are typed `int`, so `7.5` is a 422 from FastAPI; `24` passes the schema and is the service's 400.

## Uses

- `fastapi` (`APIRouter`, `HTTPException`, `Query`), `pydantic` (`BaseModel`, `Field`)
- [streams](<../core/Reporting Core - streams.md>) (`sse_response`)
- [schedules service](<../services/Reporting Service - schedules.md>) (`list_schedules`, `create`, `update`, `get`, `delete`)
- [presets service](<../services/Reporting Service - presets.md>) (`get`, to attach the preset to a created or updated row)
- [schedules repository](<../repositories/Reporting Repository - schedules.md>) (`list_runs`, with and without a schedule id)
- [schedule_runner service](<../services/Reporting Service - schedule_runner.md>) (`runner.run_now`, `runner.status`, `STREAM`)
- [renderer integration](<../integrations/Reporting Integration - renderer.md>) (`health`, `RenderError`)
- [delivery integration](<../integrations/Reporting Integration - delivery.md>) (`send`, `DeliveryError`)

## Used By

- [main](<../Reporting Server - main.md>) mounts `router`
- [server/tests/test_schedule_routes.py](../../../server/tests/test_schedule_routes.py)
- The scheduled reports page that the scheduled-delivery branch adds next.

## Key Behavior

- The literal routes (`/runs`, `/status`, `/logs`, `/renderer-health`, `/test-delivery`) are declared before the `/{schedule_id}` routes. FastAPI matches in declaration order, and `/runs` would otherwise be tried as `schedule_id="runs"` and answered with a 422 about an integer path parameter.
- `_or_error` maps `LookupError` to 404 and `ValueError` to 400 with the service's message as `detail`, the same three-line helper the [presets router](<Reporting Router - presets.md>) carries.
- Create and update answer the joined shape the list route uses (`{**row, "preset": presets.get(row["preset_id"])}`), so the page can replace one entry in its table without refetching the list.
- Run-now checks the schedule exists before asking the runner, so a stale page gets a 404 rather than a 202 for a schedule that was deleted; a 409 means another run (scheduled or manual) holds the one worker thread; the detail names that schedule from `runner.status()` so the page can say which, and the page should wait and watch `/status`. The response is 202 because the run has only been started: its outcome arrives on the run row and the `/logs` stream.
- `/logs` follows the `schedules` buffer, which the runner clears at the start of each batch; a page that opens it mid-run receives the whole retained window first, as every `/logs` route does.
- The delivery test sends to the addresses given, with an empty `cc`, the fixed subject `Reporting: delivery test`, a one-line body and `attachments: []`, so the message exercises the flow's trigger schema and the mailbox without a file. A `DeliveryError` becomes a 502 carrying the integration's text, which never includes the signed webhook URL.
- The renderer check passes the renderer's own `/health` JSON through unchanged, so the page can list `reportTypes` and compare them with the presets it holds.
- Delete checks the schedule exists through `_existing` before calling the service, so a stale page gets a 404 for a schedule that is already gone rather than a success it cannot tell from its own; the repository removes the schedule's runs first.

## Cleanup Notes

- A run-now while the runner is busy is refused rather than queued; a queue would need the runner to hold more than one batch and is not worth it for a page with a handful of schedules.
- There is no `GET /api/schedules/{id}`; the list is small enough that the page keeps it whole.

## Source

[server/routers/schedules.py](../../../server/routers/schedules.py)
