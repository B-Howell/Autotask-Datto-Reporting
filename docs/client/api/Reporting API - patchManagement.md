# Patch Management API

> Fetches the patch status report for one Datto site and exposes its log stream URL.

## Purpose

`client/src/api/patchManagement.ts` serves the Patch Management page. The server pages through the Datto site's devices, keeps the workstations, and returns a status summary for the donut chart plus a per-device list sorted worst first. It is the simplest report api: one GET keyed on `site_id` alone, because patch state lives only in Datto and the Autotask company id is not needed.

## Interface

| Function | Server route | Parameters | Returns |
|---|---|---|---|
| `fetchPatchReport` | `GET /api/patch-management?site_id[&refresh]` | `siteId: string`, `{ refresh?, signal? }` | `Promise<PatchReport>` (`summary`, `devices`, `device_count`, `synced_at`) |
| `PATCH_LOGS_URL` | `GET /api/patch-management/logs` | constant | The SSE URL string |

## Uses

- [client](<Reporting API - client.md>): `getJson`, `query`.
- [types](<Reporting API - types.md>): `PatchReport`.

## Used By

- [usePatchManagementData](<../hooks/Reporting Hook - usePatchManagementData.md>), via `patchApi` from [index](<Reporting API - index.md>). Note the namespace is `patchApi`, not `patchManagementApi`.

## Key Behavior

- `refresh` is sent only when `true`.
- The log stream is one shared endpoint, not scoped by site, so two concurrent patch reports would interleave their lines; the app runs one report at a time.
- The server sorts `devices` worst first and emits `summary` in its own status order, but the hook does not rely on either: for an agency group it calls this once per member site, sums the counts by status, rebuilds `summary` in a fixed client-side order (so a site with no devices still yields six entries), and re-sorts the concatenated device list.
- `signal` is forwarded for Cancel.

## Cleanup Notes

- None noted.

## Source

[client/src/api/patchManagement.ts](../../../client/src/api/patchManagement.ts)
