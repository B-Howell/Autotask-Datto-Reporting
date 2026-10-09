# Utilization API

> Fetches engineer-hours utilization for a date range (the quarterly and annual reports) and the raw time entries behind it, with the shared log stream URL.

## Purpose

`client/src/api/utilization.ts` serves both utilization pages. The quarterly page asks for one calendar quarter, the annual page for twelve months; both call the same `/api/agency-utilization` route with an inclusive `start` and `end`, and the server returns hours by billing category and worker per company, with category, company and grand totals. The annual page additionally pulls the raw time entries for the same range so the export can include them and the raw-entries grid can show them.

## Interface

| Function | Server route | Parameters | Returns |
|---|---|---|---|
| `fetchUtilizationReport` | `GET /api/agency-utilization?start&end[&refresh]` | `start`, `end` (inclusive `YYYY-MM-DD`), `{ refresh?, signal? }` | `Promise<UtilizationReport>` |
| `fetchUtilizationEntries` | `GET /api/agency-utilization/entries?start&end` | `start`, `end`, `{ signal? }` | `Promise<UtilizationEntriesResponse>` (`entries`) |
| `UTILIZATION_LOGS_URL` | `GET /api/agency-utilization/logs` | constant | The SSE URL string |

## Uses

- [client](<Reporting API - client.md>): `getJson`, `query`.
- [types](<Reporting API - types.md>): `UtilizationReport`, `UtilizationEntriesResponse`.

## Used By

- [useUtilizationData](<../hooks/Reporting Hook - useUtilizationData.md>) runs `fetchUtilizationReport` as a tracked job with the logs URL.
- [useAnnualReport](<../pages/reports/annualUtilization/Reporting Annual Utilization - useAnnualReport.md>) and the [AnnualUtilization page](<../pages/reports/Reporting Page - AnnualUtilization.md>) call `fetchUtilizationEntries` for the report's `start` and `end`.

## Key Behavior

- The snapshot scope is the date range, so a quarter and a year that overlap are separate cache entries and a refresh of one does not refresh the other.
- `fetchUtilizationEntries` has no `refresh` option: it reads the stored time entries the report fetch already wrote, so it is only meaningful after the report for the same range exists.
- The entries call is not a tracked job. The server writes its log lines to the same utilization stream without clearing it, but the client does not open the stream for this call. The annual page caches entries per `start:end` key and skips the call when it already has them.
- All hour values are numbers in hours; cost at standard rates is computed on the client from the billing tier.
- `signal` is forwarded on both calls.

## Cleanup Notes

- None noted.

## Source

[client/src/api/utilization.ts](../../../client/src/api/utilization.ts)
