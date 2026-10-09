# Devices API

> Fetches the merged device sheet for one agency, builds its SSE log URL, and posts grid edits back to Autotask.

## Purpose

`client/src/api/devices.ts` serves the Device Reports page. The device sheet is the one report whose result is a two-dimensional cell array (`sheet`) with a parallel array of Autotask configuration item ids, because it is rendered in an editable data grid and exported to Excel as-is. Edits made in the grid are sent back as a list of `{ deviceId, field, value }` changes.

Unlike the other report apis, the log URL is a function rather than a constant: the device log stream is scoped to the agency, so the query parameters must be included.

## Interface

| Function | Server route | Parameters | Returns |
|---|---|---|---|
| `fetchDeviceSheet` | `GET /api/devices?company_id&site_id[&refresh]` | `companyId: number`, `siteId: string`, `{ refresh?, signal? }` | `Promise<DeviceSheetResponse>` (`sheet`, `ids`, `synced_at`) |
| `deviceLogsUrl` | `GET /api/devices/logs?company_id&site_id` | `companyId`, `siteId` | The SSE URL string for `runReportJob` |
| `updateDevices` | `POST /api/devices/update` | `changes: DeviceChange[]` | `Promise<DeviceUpdateResult>` with per-device `ok`/`error` |

## Uses

- [client](<Reporting API - client.md>): `getJson`, `postJson`, `query`.
- [types](<Reporting API - types.md>): `DeviceChange`, `DeviceSheetResponse`, `DeviceUpdateResult`.

## Used By

- [useReportingData](<../hooks/Reporting Hook - useReportingData.md>), via `devicesApi` from [index](<Reporting API - index.md>): it calls `fetchDeviceSheet` per group member, passes `deviceLogsUrl` to the job runner, and calls `updateDevices` on save.

## Key Behavior

- `refresh` is only sent when `true` (the `query` helper drops `false`), so an ordinary load reads the snapshot cache and a refresh forces the vendor fetch.
- `signal` is forwarded so the status bar Cancel aborts the request; the job store also posts to the server cancel endpoint so the running fetch stops cooperatively.
- `ids[i]` is the Autotask id for `sheet` body row `i`; it is `null` for rows cached before ids were stored, and such rows cannot be edited back.
- For an agency group the hook fetches each member separately and unions the sheets; the log URL is built from the first member only, so the stream shows one member's progress.
- `updateDevices` is not abortable and not tracked as a job; it returns quickly and reports partial failure per device rather than failing the whole request.

## Cleanup Notes

- None noted.

## Source

[client/src/api/devices.ts](../../../client/src/api/devices.ts)
