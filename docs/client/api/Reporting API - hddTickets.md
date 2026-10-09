# HDD Tickets API

> Fetches the disk-space ticket report (devices the RMM keeps raising drive-full tickets for) across one or more agencies, and exposes its log stream URL.

## Purpose

`client/src/api/hddTickets.ts` serves the HDD Storage Tickets page. The report is unusual in that it is not scoped to a single agency: the caller passes a list of Autotask company ids and the server returns the matching devices for all of them, or for every configured agency when the list is empty. The log stream is a single shared endpoint rather than a per-agency one.

## Interface

| Function | Server route | Parameters | Returns |
|---|---|---|---|
| `fetchHddTickets` | `GET /api/hdd-tickets[?company_ids=1,2,3][&refresh]` | `companyIds: number[]`, `{ refresh?, signal? }` | `Promise<HddTicketsReport>` (`devices`, `device_count`, `synced_at`) |
| `HDD_LOGS_URL` | `GET /api/hdd-tickets/logs` | constant | The SSE URL string |

## Uses

- [client](<Reporting API - client.md>): `getJson`, `query`.
- [types](<Reporting API - types.md>): `HddTicketsReport`.

## Used By

- [useHddTicketsData](<../hooks/Reporting Hook - useHddTicketsData.md>), via `hddTicketsApi` from [index](<Reporting API - index.md>).

## Key Behavior

- `companyIds` is joined with commas into one `company_ids` parameter; an empty array sends no parameter at all, which the server reads as "every agency".
- For an agency group the page passes every member id, so the group is reported as one client in a single request rather than one request per member.
- `refresh` is sent only when `true`.
- The response is already aggregated (one row per device with `ticket_count`, `last_user`, `c_drive_gb`); the client does no further grouping.
- `signal` is forwarded so the status bar's Cancel aborts the request.

## Cleanup Notes

- None noted.

## Source

[client/src/api/hddTickets.ts](../../../client/src/api/hddTickets.ts)
