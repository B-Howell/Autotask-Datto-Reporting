# ticketDataStore

> Result, loading flag, error and selected agency for the monthly ticket report.

## Purpose

The ticket report summarises one agency's tickets for one month: volume by source, priority and issue type, average time to repair and first-call resolution. This store holds the merged `TicketDetails` and the run state so the page survives navigation. It is in the store layer and is filled only by `useTicketData`.

## Interface

Not created by the `reportDataStore` factory. It is the one report store with `error` but no `logs`, because the ticket endpoint has no log stream.

| Field / action | Type | Description |
|---|---|---|
| `ticketData` | `TicketDetails \| null` | The merged report for the last run, or null. |
| `loading` | `boolean` | True while the job runs. |
| `selectedCompany` | `AgencyValue \| null` | Dropdown value of the agency the data belongs to. |
| `error` | `string \| null` | Message from the last failed run. |
| setters | plain | `setTicketData`, `setLoading`, `setSelectedCompany`, `setError`. |

## Uses

- `zustand` (`create`)
- [API types](<../api/Reporting API - types.md>) for `AgencyValue`, `TicketDetails`

## Used By

- [useTicketData](<../hooks/Reporting Hook - useTicketData.md>)

## Key Behavior

- `useTicketData` sets `ticketData` to null and `selectedCompany` before each run, so the cards disappear while a new month loads rather than showing stale figures.
- For a grouped agency the hook merges member results before storing, so the store only ever holds one `TicketDetails`.
- No persistence; a reload clears it.

## Cleanup Notes

- None noted.

## Source

[client/src/store/ticketDataStore.ts](../../../client/src/store/ticketDataStore.ts)
