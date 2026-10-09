# Patch management router

> Routes for the workstation patch status report of one Datto site, plus its log stream.

## Purpose

Patch state comes only from Datto, so this report's scope is a site id with no Autotask company. The router runs the service under `run_report` and exposes the SSE stream; everything else (filtering to workstations, severity ordering, the donut summary) is in the service.

## Interface

| Method | Path | Query/body | Returns | Error mapping |
|---|---|---|---|---|
| GET | `/api/patch-management` | `site_id: str` (required), `refresh: bool = false` | `{summary: [{status, label, count}], devices: [{hostname, description, last_user, last_reboot, installed, approved_pending, not_approved, status, status_label}], device_count, synced_at}` | via `run_report`: 499 cancelled, 400 `ValueError`, 500 otherwise |
| GET | `/api/patch-management/logs` | none | SSE stream of the `patch` buffer | none |

Job label: `Patch Management · {site_id}`. Stream name: `patch`.

## Uses

- `fastapi.APIRouter`, `fastapi.Query`
- [routers common](<Reporting Router - common.md>) (`run_report`)
- [streams](<../core/Reporting Core - streams.md>) (`sse_response`)
- [patch_management service](<../services/Reporting Service - patch_management.md>) (`get_patch_report`)

## Used By

- [main](<../Reporting Server - main.md>) mounts `router`
- [client patchManagement API](<../../client/api/Reporting API - patchManagement.md>)

## Key Behavior

- `summary` always lists every status in `PATCH_STATUS_LABELS` order with a count, including zeros, so the donut's legend is stable across agencies.
- `devices` is sorted worst status first, then by hostname case-insensitively; the client does not need to re-sort.
- The job label shows the raw site id because that is the only scope the route has; the status bar does not resolve it to an agency name.
- `refresh=true` refetches the site's devices from Datto and replaces the stored scope; otherwise a stored snapshot is served with its `synced_at`.

## Cleanup Notes

- None noted.

## Source

[server/routers/patch_management.py](../../../server/routers/patch_management.py)
