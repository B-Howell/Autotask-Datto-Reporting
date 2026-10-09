# API client core

> The one `fetch` wrapper every api module goes through: JSON encoding, no-store caching, FastAPI error extraction, abort signals and query-string building.

## Purpose

`client/src/api/client.ts` is the bottom of the client's api layer. No other module calls `fetch` for JSON (the one exception is the saved-report byte download, which needs an `ArrayBuffer`). It turns a non-2xx response into an `ApiError` carrying the HTTP status and the server's `detail` string, so a hook can show "No such agency" rather than "Request failed (404)".

The design decision is `cache: 'no-store'` on every request. The server already sends no-store headers, but setting the fetch cache mode as well means a service worker or an intermediate proxy can never answer a report request from a stale copy.

## Interface

| Function | Server route | Parameters | Returns |
|---|---|---|---|
| `ApiError` (class) | n/a | `status: number`, `message: string` | An `Error` subclass with `name = 'ApiError'` and a readonly `status`. |
| `getJson<T>` | any | `url`, `{ signal? }` | `Promise<T>` from a GET. |
| `postJson<T>` | any | `url`, `body?`, `{ signal? }` | `Promise<T>`; JSON body and `Content-Type` only when `body` is given. |
| `putJson<T>` | any | `url`, `body` | `Promise<T>` from a PUT with a JSON body. |
| `postForm<T>` | any | `url`, `form: FormData` | `Promise<T>`; the browser sets the multipart content type. |
| `deleteJson<T>` | any | `url` | `Promise<T>` from a DELETE. |
| `query` | n/a | `Record<string, string \| number \| boolean \| undefined>` | `?k=v&...` or `''`. |

## Uses

- The browser `fetch`, `URLSearchParams` and `AbortSignal`.

## Used By

- Every other api module: [agencies](<Reporting API - agencies.md>), [devices](<Reporting API - devices.md>), [hddTickets](<Reporting API - hddTickets.md>), [jobs](<Reporting API - jobs.md>), [manualInputs](<Reporting API - manualInputs.md>), [officeWindows](<Reporting API - officeWindows.md>), [patchManagement](<Reporting API - patchManagement.md>), [savedReports](<Reporting API - savedReports.md>), [sla](<Reporting API - sla.md>), [sync](<Reporting API - sync.md>), [tickets](<Reporting API - tickets.md>), [utilization](<Reporting API - utilization.md>).
- [index](<Reporting API - index.md>) re-exports `ApiError`.

## Key Behavior

- Error mapping: when `res.ok` is false the body is parsed as JSON and `detail` is used when it is a string; any other body shape, or a non-JSON body, yields `Request failed (<status>)`. The 499 the server returns for a cancelled report therefore becomes an `ApiError`, but a client-side abort surfaces as a `DOMException` named `AbortError` from `fetch` itself, before any response exists.
- A 2xx response is always parsed as JSON; an endpoint that returns an empty body would throw here. Every endpoint the client calls returns JSON.
- `query` drops `undefined` and `false` values, so `refresh: false` produces no `refresh` parameter and the server's default applies; `true` becomes the string `true`.
- `postJson` with no body sends no `Content-Type` header, which is what the parameterless `POST /api/sync` and `POST /api/jobs/current/cancel` expect.
- Only `getJson` and `postJson` accept an `AbortSignal`; mutations (`putJson`, `deleteJson`, `postForm`) cannot be cancelled from the status bar.

## Cleanup Notes

- `ApiError` is exported through `index.ts` but no consumer checks `instanceof ApiError` or reads `.status`; callers only use `.message` via `errorMessage`. The status is available for future use but currently unread.

## Source

[client/src/api/client.ts](../../../client/src/api/client.ts)
