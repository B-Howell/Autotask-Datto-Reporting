# useHddTicketsData

> Runs the disk-space ticket report as a tracked job and exposes its store.

## Purpose

The HDD tickets report asks the server which devices keep raising "drive nearly full" tickets, for one agency, a group, or every agency. This hook binds `hddTicketsStore` to `useTrackedReport` and returns the fields the page renders. It is in the hook layer.

## Interface

Returns `devices`, `deviceCount`, `loading`, `logs`, `companyValue`, `generatedLabel` from the store, plus `setCompanyValue` and:

| Function | Description |
|---|---|
| `fetchHddTickets(companyIds, label)` | Stores `label` as `generatedLabel`, then runs the job. An empty `companyIds` means every configured agency. |

## Uses

- [hddTickets API](<../api/Reporting API - hddTickets.md>) for `fetchHddTickets`, `HDD_LOGS_URL`
- [hddTicketsStore](<../store/Reporting Store - hddTicketsStore.md>)
- [useTrackedReport](<Reporting Hook - useTrackedReport.md>)

## Used By

- [HddTickets page](<../pages/reports/Reporting Page - HddTickets.md>)

## Key Behavior

- The status bar label is the fixed `HDD Storage Tickets` and the route `/reports/hdd-tickets`; the agency selection is not in the label, so re-running for a different selection replaces the previous row.
- One request carries all company ids; the server does the per-agency work, unlike the device and patch hooks which loop over members on the client.
- `setGeneratedLabel` runs before the job starts, so the heading reflects the run in flight.
- On success `devices` and `device_count` are stored; on failure both are cleared. No `setError` is passed, so errors reach only the status bar and console.

## Cleanup Notes

- None noted.

## Source

[client/src/hooks/useHddTicketsData.ts](../../../client/src/hooks/useHddTicketsData.ts)
