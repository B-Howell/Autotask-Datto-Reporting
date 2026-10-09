# SLA API

> Fetches the month-wide SLA performance report (every agency's tickets against contracted response and resolution targets) and exposes its log stream URL.

## Purpose

`client/src/api/sla.ts` serves the SLA Performance page. Unlike the per-agency reports, the SLA report is scoped to a calendar month across all companies: the server returns the ticket list, a company id to name map, the tickets grouped by company and resource, a per-resource pivot and the SLA target table, and the page filters and pivots from there. The snapshot scope is therefore `{year, month}`.

## Interface

| Function | Server route | Parameters | Returns |
|---|---|---|---|
| `fetchSlaReport` | `GET /api/sla-performance?year&month[&refresh]` | `year: number`, `month: number` (1 to 12), `{ refresh?, signal? }` | `Promise<SlaReport>` |
| `SLA_LOGS_URL` | `GET /api/sla-performance/logs` | constant | The SSE URL string |

## Uses

- [client](<Reporting API - client.md>): `getJson`, `query`.
- [types](<Reporting API - types.md>): `SlaReport`.

## Used By

- [useSlaData](<../hooks/Reporting Hook - useSlaData.md>), via `slaApi` from [index](<Reporting API - index.md>).

## Key Behavior

- `month` is one-based, matching the server and the `MONTH_NAMES` index plus one in the dates util.
- `refresh` is sent only when `true`.
- The response field names are camelCase (`ticketNumber`, `firstResponseMet`), unlike most other reports, because the server emits them in the shape the Excel export writes; see `SlaTicket` in types.
- `firstResponseMet`, `resolutionPlanMet` and `resolvedMet` are `boolean | null`; `null` means the ticket has no target for that measure and must be excluded from percentages, not counted as a miss.
- There is no agency parameter; agency filtering happens on the client against `companies`.
- `signal` is forwarded for Cancel.

## Cleanup Notes

- None noted.

## Source

[client/src/api/sla.ts](../../../client/src/api/sla.ts)
