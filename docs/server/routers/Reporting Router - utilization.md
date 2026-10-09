# Utilization router

> Routes for engineer utilization over an inclusive date range: the aggregated report, the raw time entries behind it for the Excel export, and the log stream.

## Purpose

Utilization attributes every hour booked in a period to a company and a billing tier. The report route runs under `run_report`; the entries route reads the stored time entries the report left behind so the annual export can include them. Because the entries route can trigger a fetch of its own when a period has never been run, it logs to the same stream and feeds whatever job is running rather than starting one.

## Interface

| Method | Path | Query/body | Returns | Error mapping |
|---|---|---|---|---|
| GET | `/api/agency-utilization` | `start`, `end`: `YYYY-MM-DD` inclusive (required), `refresh: bool = false` | `{categories, companies, rows: [{category, worker, byCompany}], categoryTotals, companyTotals, grandTotal, start, end, periodLabel, synced_at}` | via `run_report`: 499 cancelled, 400 `ValueError` (unparseable date, `end` before `start`), 500 otherwise |
| GET | `/api/agency-utilization/entries` | `start`, `end` as above | `{entries: [...]}` stored time entries without their scope columns | 400 on `ValueError`; other exceptions 500 |
| GET | `/api/agency-utilization/logs` | none | SSE stream of the `utilization` buffer | none |

Job label: `Utilization · {start} to {end}`. Stream name: `utilization`.

## Uses

- `fastapi.APIRouter`, `fastapi.HTTPException`, `fastapi.Query`
- [routers common](<Reporting Router - common.md>) (`run_report`)
- [jobs](<../core/Reporting Core - jobs.md>) (`note_current`) and [streams](<../core/Reporting Core - streams.md>) (`sse_response`, `report_logger`)
- [utilization service](<../services/Reporting Service - utilization.md>) (`get_utilization`, `get_entries`)

## Used By

- [main](<../Reporting Server - main.md>) mounts `router`
- [client utilization API](<../../client/api/Reporting API - utilization.md>)
- [server/tests/test_routes.py](../../../server/tests/test_routes.py) (`test_a_bad_date_range_is_a_400_with_the_reason`)

## Key Behavior

- `START` and `END` are module-level `Query(...)` objects shared by both routes so the descriptions stay identical; dates are validated by the service (`parse_date`, `_validated_range`), not by FastAPI, which is why a reversed range is a 400 with `end (...) is before start (...)` and not a 422.
- The entries route is not a tracked job. Its logger is built with `clear=False` so it appends to the report's log instead of wiping it, and each line is also passed to `jobs.note_current`, so if the report job is still showing in the status bar the export's progress appears there.
- When no entries are stored for the range, the entries route calls `refresh_snapshot`, which refetches the whole period; that takes as long as generating the report and cannot be cancelled, because the logger has no job id.
- The range itself is the cache key, so any two requests for the same dates share one snapshot; the sync refreshes only the current quarter and fiscal year.
- `periodLabel` names a calendar quarter, a fiscal year (`FY 2025-26`, September to August) or a calendar year when the range matches one exactly, otherwise `dd Mon yyyy - dd Mon yyyy`.

## Cleanup Notes

- `note_current` attaches entries-route lines to whatever job happens to be running, which may be an unrelated report started from another tab.

## Source

[server/routers/utilization.py](../../../server/routers/utilization.py)
