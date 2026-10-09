# Devices router

> Routes for the device inventory report: generate or read the sheet, follow its log stream, and write edited grid cells back to Autotask.

## Purpose

The device report is the longest-running report (hundreds of paginated API calls per client) and the one place the application writes to a vendor. This router exposes the read-through sheet under `run_report` so it is tracked and cancellable, the SSE stream for its log, and a write-back route that accepts a list of cell changes and returns a per-device outcome.

## Interface

| Method | Path | Query/body | Returns | Error mapping |
|---|---|---|---|---|
| GET | `/api/devices` | `company_id: int` (required), `site_id: str` (required), `refresh: bool = false` | `{sheet, ids, synced_at, cached}` where `sheet` is a header row plus one list per device and `ids` holds the Autotask configuration item id per body row | via `run_report`: 499 cancelled, 400 `ValueError`, 500 otherwise |
| GET | `/api/devices/logs` | none | SSE stream of the `devices` buffer | none |
| POST | `/api/devices/update` | body `DeviceUpdate {changes: [{deviceId: int, field: str, value: str | null}]}` | `{status: "success", results: [{deviceId, status, error?}]}` | 422 on a malformed body |

Job label: `Device Report · {company_id}`. Stream name: `devices`.

## Uses

- `fastapi.APIRouter`, `fastapi.Query`, `pydantic.BaseModel`
- [routers common](<Reporting Router - common.md>) (`run_report`)
- [streams](<../core/Reporting Core - streams.md>) (`sse_response`, `report_logger`)
- [devices service](<../services/Reporting Service - devices.md>) (`get_device_sheet`, `update_devices`)

## Used By

- [main](<../Reporting Server - main.md>) mounts `router`
- [client devices API](<../../client/api/Reporting API - devices.md>)
- [server/tests/test_routes.py](../../../server/tests/test_routes.py) (`test_device_update_rejects_a_malformed_body`)

## Key Behavior

- The sheet route is the only one under `run_report`; `refresh=true` bypasses the snapshot cache and refetches the scope.
- `/logs` is an `async def` route returning the shared SSE response; the client appends `company_id` and `site_id` to the logs URL, but the server ignores them because the stream is per report type, not per agency.
- The update route does not use `run_report`. It builds a logger with `clear=False` so the write-back lines are appended to the devices stream after the report's own log instead of wiping it, and because there is no job id the logger never checks the cancel flag.
- A change with a missing `deviceId` or a field outside `EDITABLE_DEVICE_FIELDS` is dropped by the service with a `[WARN]` line, never sent; the route still answers `status: "success"` with the per-device results, which may be an empty list.
- A failed PATCH for one device is reported as `{deviceId, status: "error", error}` in `results`, not as an HTTP error, so one bad device does not hide the outcome of the others.
- `DeviceChange.value` accepts `null`, which the service passes through to clear a UDF.

## Cleanup Notes

- `status: "success"` on the update response is constant and carries no information; callers must inspect `results` for per-device errors.

## Source

[server/routers/devices.py](../../../server/routers/devices.py)
