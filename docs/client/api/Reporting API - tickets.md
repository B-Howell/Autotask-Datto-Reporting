# Tickets API

> Fetches one agency's ticket breakdown for a calendar month: counts by source, priority and issue type, time to repair and first-call resolution.

## Purpose

`client/src/api/tickets.ts` serves the Ticket Reports page. The server reads the month's tickets for the company from the snapshot cache (or Autotask on refresh) and returns them already aggregated, so the page only draws charts and cards. It is the one report api with no log stream URL: the ticket report is quick enough that it is tracked in the status bar without a server log.

## Interface

| Function | Server route | Parameters | Returns |
|---|---|---|---|
| `fetchTicketDetails` | `GET /api/tickets/details?company_id&year&month[&refresh]` | `companyId: number`, `year: number`, `month: number` (1 to 12), `{ refresh?, signal? }` | `Promise<TicketDetails>` |

## Uses

- [client](<Reporting API - client.md>): `getJson`, `query`.
- [types](<Reporting API - types.md>): `TicketDetails`.

## Used By

- [useTicketData](<../hooks/Reporting Hook - useTicketData.md>), via `ticketsApi` from [index](<Reporting API - index.md>).

## Key Behavior

- `month` is one-based.
- `refresh` is sent only when `true`.
- The breakdown maps (`source_breakdown`, `priority_breakdown`, `issue_type_breakdown`) are keyed by the human label the server resolved from Autotask picklists, not by picklist id.
- For an agency group the hook calls this once per member and merges the results: counts are summed and `avg_time_to_repair` averages are re-weighted by `completed_tickets`, so a group's figure is a true average rather than an average of averages.
- `synced_at` is optional in the type because the merged group result does not carry one.
- `signal` is forwarded for Cancel.

## Cleanup Notes

- None noted.

## Source

[client/src/api/tickets.ts](../../../client/src/api/tickets.ts)
