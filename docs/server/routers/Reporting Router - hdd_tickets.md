# HDD tickets router

> Routes for the disk-space ticket report: devices the RMM raised "C: near full" tickets for, across one or more agencies, plus its log stream.

## Purpose

This report is cross-agency by default: with no company ids it covers every configured agency. The router parses the optional comma-separated id list, hands the report to `run_report` so it is tracked and cancellable, and exposes the SSE stream the page follows.

## Interface

| Method | Path | Query/body | Returns | Error mapping |
|---|---|---|---|---|
| GET | `/api/hdd-tickets` | `company_ids: str | null` (comma-separated; omit for all), `refresh: bool = false` | `{devices: [{device_name, ticket_count, last_user, c_drive_gb}], device_count, synced_at}` sorted by ticket count descending then name | via `run_report`: 499 cancelled, 400 `ValueError`, 500 otherwise |
| GET | `/api/hdd-tickets/logs` | none | SSE stream of the `hdd` buffer | none |

Job label: `HDD Storage Tickets`. Stream name: `hdd`.

## Uses

- `fastapi.APIRouter`, `fastapi.Query`
- [routers common](<Reporting Router - common.md>) (`run_report`)
- [streams](<../core/Reporting Core - streams.md>) (`sse_response`)
- [hdd_tickets service](<../services/Reporting Service - hdd_tickets.md>) (`get_hdd_report`)

## Used By

- [main](<../Reporting Server - main.md>) mounts `router`
- [client hddTickets API](<../../client/api/Reporting API - hddTickets.md>)

## Key Behavior

- `_parse_ids` returns `None` for a missing or empty string and otherwise keeps only the tokens that are integers after stripping whitespace and a leading minus sign; `"12,abc,-3"` becomes `[12, -3]`.
- A list in which every token is invalid parses to `[]`, which the service treats the same as `None`: every configured agency is reported. A typo in the only id therefore widens the report rather than failing it.
- The service fetches each company's scope separately through the snapshot cache; `synced_at` in the response is the oldest member's, because the report is only as fresh as its stalest agency.
- The job label does not include the ids, so two different selections look the same in the status bar.
- `/logs` starts from the retained backlog, so a page opened mid-run sees the lines already written.

## Cleanup Notes

- Silently discarding unparseable ids (and widening to all agencies when none survive) is a behaviour a caller cannot detect from the response; a 400 would be safer.

## Source

[server/routers/hdd_tickets.py](../../../server/routers/hdd_tickets.py)
