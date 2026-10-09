# useTicketData

> Runs the monthly ticket report for an agency or group and merges member results into one `TicketDetails`.

## Purpose

The ticket report summarises volume, repair time and first-call resolution for one agency in one month. The server answers per Autotask company; a grouped agency needs those combined, and averages must be re-weighted rather than averaged again. This hook does the loop and the merge and writes `ticketDataStore`. It is in the hook layer.

## Interface

Returns `ticketData`, `loading`, `selectedCompany`, `error` from the store, plus:

| Export | Description |
|---|---|
| `fetchTicketDetails(agency, year, month)` | Clears the data, records the selection, runs the tracked job. |
| `mergeTicketDetails(a, b)` | Pure merge of two `TicketDetails` objects. |

## Uses

- [tickets API](<../api/Reporting API - tickets.md>) for `fetchTicketDetails`
- [API types](<../api/Reporting API - types.md>) for `EffectiveAgency`, `RepairTime`, `TicketDetails`
- [ticketDataStore](<../store/Reporting Store - ticketDataStore.md>)
- [agencyGroups util](<../utils/Reporting Util - agencyGroups.md>) for `membersOf`, `valueFor`
- [useTrackedReport](<Reporting Hook - useTrackedReport.md>)

## Used By

- [Tickets page](<../pages/reports/Reporting Page - Tickets.md>)

## Key Behavior

- Label `Ticket Report · <agency name> · <year>-<MM>`, route `/reports/tickets`. No `logsUrl` and no `setLogs`: the ticket endpoint has no log stream, so the status bar row shows only start and finish.
- Members are fetched sequentially with the abort signal and folded left to right with `mergeTicketDetails`.
- Merge rules: `total_tickets` and the three breakdown maps are summed per key; `avg_time_to_repair` is re-weighted by `completed_tickets` per key and rounded to two decimals; first-call resolution sums the phone totals and recomputes `percentage` to two decimals, 0 when there are no phone tickets.
- `setError` is passed, so failures reach the page's `ErrorBanner`. No `onFailure`, so `ticketData` stays null (it was cleared before the run).

## Cleanup Notes

- `mergeTicketDetails` is exported but has no unit test.

## Source

[client/src/hooks/useTicketData.ts](../../../client/src/hooks/useTicketData.ts)
