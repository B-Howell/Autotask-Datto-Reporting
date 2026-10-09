# Jobs API

> Reads, cancels and dismisses the server's record of the one report currently running, so a reloaded page can rebuild the status bar.

## Purpose

`client/src/api/jobs.ts` wraps the `/api/jobs/current` routes. The server keeps a single job record (label, status, progress, error, timestamps) for the report it is generating. The client's job store is the primary tracker while the page is open; these calls exist so that a reload, or a second browser tab, can adopt the server's view of the run, and so that Cancel and Dismiss reach the server as well as the local store.

## Interface

| Function | Server route | Parameters | Returns |
|---|---|---|---|
| `fetchCurrentJob` | `GET /api/jobs/current` | none | `Promise<ServerJob \| null>`; `null` when nothing is running |
| `cancelCurrentJob` | `POST /api/jobs/current/cancel` | none | `Promise<{ cancelled: boolean }>` |
| `dismissCurrentJob` | `DELETE /api/jobs/current` | none | `Promise<{ ok: boolean }>` |

## Uses

- [client](<Reporting API - client.md>): `getJson`, `postJson`, `deleteJson`.
- [types](<Reporting API - types.md>): `ServerJob`.

## Used By

- [useServerJob](<../hooks/Reporting Hook - useServerJob.md>) polls `fetchCurrentJob` and feeds the result to the store's `adoptServerJob`.
- [reportJobStore](<../store/Reporting Store - reportJobStore.md>) calls `cancelCurrentJob` from `cancelJob` and `dismissCurrentJob` from `dismissJob`.

## Key Behavior

- The server answers `{}` rather than 404 when no job exists. `fetchCurrentJob` normalises that: it fetches as `Partial<ServerJob>` and returns `null` unless `id` is present, so callers never see an empty object.
- `cancel` sets the server's cancel flag; the running report notices it on its next log call. The response `cancelled` is `false` when there was nothing to cancel.
- The store calls `dismissCurrentJob` only when no local job is still running; otherwise the next poll would re-adopt the row that was just dismissed.
- Both mutations are fire-and-forget in the store (`.catch(() => {})`); a failure to reach the server does not undo the local cancel or dismiss.
- There is one server-side job slot. Starting a second report replaces the record; the client store handles superseding by label.

## Cleanup Notes

- None noted.

## Source

[client/src/api/jobs.ts](../../../client/src/api/jobs.ts)
