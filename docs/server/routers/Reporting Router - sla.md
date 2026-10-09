# SLA router

> Routes for the monthly SLA performance report across all companies, plus its log stream.

## Purpose

SLA performance is a month-scoped, all-company report: every ticket closed in the month with its response and resolution metrics, grouped by resource, priority and issue type. The router validates the year and month ranges with `Query` constraints, runs the service under `run_report`, and exposes the SSE stream.

## Interface

| Method | Path | Query/body | Returns | Error mapping |
|---|---|---|---|---|
| GET | `/api/sla-performance` | `year: int` (2000 to 2100), `month: int` (1 to 12), both required; `refresh: bool = false` | `{tickets, companies, grouped, pivot, slaTargets, month, year, synced_at}` | 422 when year or month is out of range; via `run_report`: 499 cancelled, 400 `ValueError`, 500 otherwise |
| GET | `/api/sla-performance/logs` | none | SSE stream of the `sla` buffer | none |

Job label: `SLA Performance · {year}-{month:02d}`. Stream name: `sla`.

## Uses

- `fastapi.APIRouter`, `fastapi.Query`
- [routers common](<Reporting Router - common.md>) (`run_report`)
- [streams](<../core/Reporting Core - streams.md>) (`sse_response`)
- [sla service](<../services/Reporting Service - sla.md>) (`get_sla_report`)

## Used By

- [main](<../Reporting Server - main.md>) mounts `router`
- [client sla API](<../../client/api/Reporting API - sla.md>)

## Key Behavior

- Range checks happen in FastAPI before the route body, so an out-of-range month is a 422 validation error and never creates a job record; only errors raised inside the service reach `run_report`'s 400 mapping.
- The month is zero-padded in the label so the status bar reads `2026-03`, matching the snapshot scope.
- `slaTargets` in the response is keyed by priority label (for example `P1 Critical`) rather than id, so the client never sees picklist numbers.
- A past month is cached on first view and left alone by the sync; only the month in progress is refreshed on the schedule, so `refresh=true` is the way to regenerate an old month.
- The response is the same shape whether it came from the cache or a fresh fetch; `synced_at` is the only indicator.

## Cleanup Notes

- None noted.

## Source

[server/routers/sla.py](../../../server/routers/sla.py)
