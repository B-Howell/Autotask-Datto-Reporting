# Agencies API

> Lists, creates and deletes the configured agencies (the Autotask company to Datto site pairings the reports run for).

## Purpose

`client/src/api/agencies.ts` wraps the three `/api/agencies` routes. An agency is the unit every report selects by: an Autotask company id, its Datto site id and a display name. The list is loaded once at app start by the agency store and edited from the Settings page.

The server answers every mutation with the full updated list, so the store can replace its state wholesale rather than patching, which keeps create and delete one line each.

## Interface

| Function | Server route | Parameters | Returns |
|---|---|---|---|
| `fetchAgencies` | `GET /api/agencies` | none | `Promise<Agency[]>` |
| `createAgency` | `POST /api/agencies` | `agency: Agency` (`id`, `site`, `name`) | `Promise<Agency[]>`, the full list after the insert |
| `deleteAgency` | `DELETE /api/agencies/{id}` | `id: number` (Autotask company id) | `Promise<Agency[]>`, the full list after the delete |

## Uses

- [client](<Reporting API - client.md>): `getJson`, `postJson`, `deleteJson`.
- [types](<Reporting API - types.md>): `Agency`.

## Used By

- [agencyStore](<../store/Reporting Store - agencyStore.md>), the only caller, via the `agenciesApi` namespace from [index](<Reporting API - index.md>).

## Key Behavior

- No `AbortSignal` is offered; these are small, fast calls that are not tracked as jobs.
- The agency `id` doubles as the path parameter on delete and as the `company_id` query parameter every report sends, so it must be the Autotask company id, not a local row id.
- The server validates the body as a Pydantic model; a malformed agency comes back as a 422 whose `detail` is not a plain string, so the thrown `ApiError` message falls back to `Request failed (422)`.
- Agency groups (several companies shown as one dropdown entry) are a client-only concept built on top of this list; see [agencyGroups util](<../utils/Reporting Util - agencyGroups.md>). The server knows nothing about them.

## Cleanup Notes

- None noted.

## Source

[client/src/api/agencies.ts](../../../client/src/api/agencies.ts)
