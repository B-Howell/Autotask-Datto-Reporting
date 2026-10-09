# Tickets router

> The ticket breakdown for one company and month, run as a tracked job.

## Purpose

The monthly ticket report counts volume by source, priority and issue type, average time to repair per priority and first-call resolution for phone tickets. The router validates the scope with `Query` constraints and runs the service under `run_report`. Unlike the other report routers it exposes no `/logs` route; the client calls this report without a log stream.

## Interface

| Method | Path | Query/body | Returns | Error mapping |
|---|---|---|---|---|
| GET | `/api/tickets/details` | `company_id: int` (required), `year: int` (2000 to 2100), `month: int` (1 to 12), `refresh: bool = false` | `{total_tickets, source_breakdown, priority_breakdown, issue_type_breakdown, avg_time_to_repair, first_call_resolution, synced_at}` | 422 when year or month is out of range; via `run_report`: 499 cancelled, 400 `ValueError`, 500 otherwise |

Job label: `Ticket Report · {company_id} · {year}-{month:02d}`. Stream name: `tickets` (written to, but not served).

## Uses

- `fastapi.APIRouter`, `fastapi.Query`
- [routers common](<Reporting Router - common.md>) (`run_report`)
- [tickets service](<../services/Reporting Service - tickets.md>) (`get_ticket_details`)

## Used By

- [main](<../Reporting Server - main.md>) mounts `router`
- [client tickets API](<../../client/api/Reporting API - tickets.md>)

## Key Behavior

- The run is still a tracked job: `run_report` creates the job record, so the status bar shows the label and the last log line from `GET /api/jobs/current`, and Cancel works through the per-run logger. What is missing is only the SSE tail.
- Log lines go to the `tickets` buffer via `report_logger`, but no route calls `streams.sse_response("tickets")`, so they are visible on stdout and in the job record's `status_text` only.
- Grouped agencies are handled on the client: the hook calls this route once per member company and merges the results, so the server only ever sees one company id.
- Breakdowns are keyed by the labels from `report_rules` in their `_ORDER` sequence, with the fallback bucket for unknown picklist ids.

## Cleanup Notes

- The module does not import `streams` and has no `/logs` route while every other `run_report` router does; adding the two-line route would give the page the same live tail as the others.

## Source

[server/routers/tickets.py](../../../server/routers/tickets.py)
