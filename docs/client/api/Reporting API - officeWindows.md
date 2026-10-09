# Office/Windows API

> Fetches the installed Office product and Windows version breakdown for one agency and builds its SSE log URL.

## Purpose

`client/src/api/officeWindows.ts` serves the Office / Windows licensing page. The server scans the Datto software audit for the agency's site, groups installs by product name, and returns two lists (`windows_installs`, `office_installs`), each item carrying the install count and the device names behind it. The page adds the manually entered licence counts and builds the Word and PDF exports from the result.

As with devices, the log stream is scoped to the agency, so the URL is a function of the ids.

## Interface

| Function | Server route | Parameters | Returns |
|---|---|---|---|
| `fetchOfficeWindowsBreakdown` | `GET /api/office-windows/breakdown?company_id&site_id[&refresh]` | `companyId: number`, `siteId: string`, `{ refresh?, signal? }` | `Promise<OfficeWindowsBreakdown>` |
| `officeWindowsLogsUrl` | `GET /api/office-windows/breakdown/logs?company_id&site_id` | `companyId`, `siteId` | The SSE URL string |

## Uses

- [client](<Reporting API - client.md>): `getJson`, `query`.
- [types](<Reporting API - types.md>): `OfficeWindowsBreakdown`.

## Used By

- [useOfficeWindowsData](<../hooks/Reporting Hook - useOfficeWindowsData.md>), via `officeWindowsApi` from [index](<Reporting API - index.md>).

## Key Behavior

- `refresh` is sent only when `true`; otherwise the snapshot cache answers.
- `company_id` is sent even though the data comes from Datto, because the snapshot scope and the agency identity are keyed on the pair.
- The hook fetches each member of an agency group sequentially and merges the two install lists by product name, summing `installs` and de-duplicating `devices` with a `Set`.
- `signal` is forwarded for Cancel.

## Cleanup Notes

- None noted.

## Source

[client/src/api/officeWindows.ts](../../../client/src/api/officeWindows.ts)
