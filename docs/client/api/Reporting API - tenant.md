# Tenant API

> Fetches the deployment's presentation settings (agency groups, the logo map, the rated departments and the two picker year floors) from `GET /api/tenant`.

## Purpose

`client/src/api/tenant.ts` wraps the one read route of the server's tenant router. Every value in the response used to be a constant in client source, which meant a private deployment had to edit tracked files to name its agency groups, map its logos or set its billing rates. The server now merges those values from an untracked `data/tenant.json` over the same defaults the client ships with, and the app fetches the result once at startup into the tenant store.

Logo files are not fetched through this module. The store builds `/api/tenant/logos/<file>` URLs from the logo map, and the browser `Image`, the PDF builder and the Word export load those directly.

## Interface

| Function | Server route | Parameters | Returns |
|---|---|---|---|
| `fetchTenant` | `GET /api/tenant` | none | `Promise<TenantSettings>` |

## Uses

- [client](<Reporting API - client.md>): `getJson`.
- [types](<Reporting API - types.md>): `TenantSettings`.

## Used By

- [App](<../Reporting Client - App.md>), the only caller, via the `tenantApi` namespace from [index](<Reporting API - index.md>).

## Key Behavior

- No `AbortSignal` is offered; this is one small, fast call that is not tracked as a job.
- The response always carries every key. The server lays the file over its defaults before answering, so the client never has to merge, and `tenantStore.setTenant` can replace its state wholesale.
- A failed fetch is not an error the user sees. `App` swallows it and the store keeps [its defaults](<../store/Reporting Store - tenantStore.md>), which are identical to the server's `DEFAULTS`, so a server built before this route existed, or an unreachable one, gives the same behaviour the client had when these values were constants.
- The settings are fetched once per page load. An edit to `data/tenant.json` is served on the server's next request but reaches an open tab only after a reload.
- The server route and file shape are described in the [tenant router](<../../server/routers/Reporting Router - tenant.md>) and [tenant service](<../../server/services/Reporting Service - tenant.md>) pages.

## Cleanup Notes

- None noted.

## Source

[client/src/api/tenant.ts](../../../client/src/api/tenant.ts)
