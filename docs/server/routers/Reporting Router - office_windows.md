# Office and Windows router

> Routes for the Office and Windows licensing breakdown of one agency, plus its log stream.

## Purpose

The licensing report counts Windows 10 and 11 installs and one primary Office product per device for a client. The router validates the scope (an Autotask company id and a Datto site id), runs the service under `run_report` so the run is tracked and cancellable, and exposes the SSE stream. The licence counts typed against the result go through the manual inputs router, not this one.

## Interface

| Method | Path | Query/body | Returns | Error mapping |
|---|---|---|---|---|
| GET | `/api/office-windows/breakdown` | `company_id: int` (required), `site_id: str` (required), `refresh: bool = false` | `{windows_installs: [{name, installs, devices}], office_installs: [{name, installs, devices}], synced_at}` | via `run_report`: 499 cancelled, 400 `ValueError`, 500 otherwise |
| GET | `/api/office-windows/breakdown/logs` | none | SSE stream of the `office-windows` buffer | none |

Job label: `Office / Windows · {company_id}`. Stream name: `office-windows`.

## Uses

- `fastapi.APIRouter`, `fastapi.Query`
- [routers common](<Reporting Router - common.md>) (`run_report`)
- [streams](<../core/Reporting Core - streams.md>) (`sse_response`)
- [office_windows service](<../services/Reporting Service - office_windows.md>) (`get_office_windows`)

## Used By

- [main](<../Reporting Server - main.md>) mounts `router`
- [client officeWindows API](<../../client/api/Reporting API - officeWindows.md>)

## Key Behavior

- The paths sit under `/breakdown` rather than at the prefix root, and the logs route is `/breakdown/logs`; the client mirrors both.
- The query parameter is named `site_id` here while the service parameter is `site_uid`; both are the Datto site identifier.
- Each install entry carries the list of device names behind the count (`devices`, parsed from the stored `devices_json`), so the page can show which machines make up a figure.
- Served-from-cache runs still produce a job record and a log line (`Office/Windows served from cache`), so the status bar shows a short completed run rather than nothing.
- As with every `/logs` route, the client's extra query parameters are ignored; the stream is per report type.

## Cleanup Notes

- None noted.

## Source

[server/routers/office_windows.py](../../../server/routers/office_windows.py)
