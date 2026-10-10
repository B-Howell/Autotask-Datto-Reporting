# Credentials API

> Reads the vendor credential status, probes both vendors with submitted values, saves values that pass, and forgets every stored value on request.

## Purpose

`client/src/api/credentials.ts` wraps the `/api/credentials` routes behind the Settings page's
Vendor credentials section. The server holds the Autotask and Datto keys encrypted and never
serves a stored value back; what the page gets is each field's source (environment, stored or
missing), the tail of a stored secret, and the timestamps of its last save and last test. A
value is proven by testing it against the vendor, and a save is that test followed by the
write.

## Interface

| Function | Server route | Parameters | Returns |
|---|---|---|---|
| `fetchCredentials` | `GET /api/credentials` | none | `Promise<CredentialsStatus>` |
| `testCredentials` | `POST /api/credentials/test` | `values: CredentialValues` | `Promise<ConnectionTestResult>`, one `{ ok, message }` per vendor |
| `saveCredentials` | `PUT /api/credentials` | `values: CredentialValues` | `Promise<CredentialsStatus>`, the same `{ demoMode, keySource, fields }` as `fetchCredentials`, as it stands after the save |
| `forgetCredentials` | `DELETE /api/credentials` | none | `Promise<ForgottenCredentials>`, `{ forgotten: true }` with the status once every stored row is gone |
| `isUnreadable` | none | `err: unknown` | `true` when `err` is the 503 `ApiError` that `fetchCredentials` raises for stored values the key cannot read |

## Uses

- [client](<Reporting API - client.md>): `getJson`, `postJson`, `putJson`, `deleteJson`, `ApiError`.
- [types](<Reporting API - types.md>): `CredentialsStatus`, `CredentialValues`, `ConnectionTestResult`, `ForgottenCredentials`.

## Used By

- [useCredentials](<../pages/settings/Reporting Settings - useCredentials.md>) calls all four requests and classifies a failed fetch with `isUnreadable`.

## Key Behavior

- Both write routes take `{ values }` keyed by field name (`autotask_username`, `autotask_secret`,
  `autotask_integration_code`, `autotask_base_url`, `datto_api_key`, `datto_api_secret`,
  `datto_platform`). A blank or absent value means "keep what is stored", so a caller sends
  only what was typed.
- `testCredentials` probes both vendors every time, each with the submitted values laid over
  the stored ones, and records the outcomes on the stored rows; a vendor with a blank field
  answers `ok: false` with an "incomplete" message instead of a request. Nothing is saved.
- `saveCredentials` resolves with the same shape as `fetchCredentials`, so the hook replaces
  its status from the response instead of fetching again. It rejects with a 400 `ApiError`
  whose message names the vendor that refused (`Autotask refused the credentials: ...`), or
  the validation that failed (the base URL must start with `https://`, the platform is one
  host label, a field set by the environment cannot be stored). The vendor's refusal text has
  every submitted value blanked before it reaches the message.
- The write routes and `forgetCredentials` reject with a 409 `ApiError` in demo mode, where
  the vendor clients are simulated and no key is used.
- `forgetCredentials` never rejects with the 503: the server deletes the rows without reading
  them, so it is the call the section offers when the status itself cannot be loaded. Values
  set by the environment are not stored and stay in effect.
- `fetchCredentials` rejects with a 503 `ApiError` when stored values exist that the current
  master key cannot decrypt; the section shows that detail in its error banner. `isUnreadable`
  names that case so the hook can tell it from a network failure or a 500, for which
  forgetting would be the wrong remedy. The credentials route maps nothing else to 503.
- Routes are listed under [Reporting Router - credentials](<../../server/routers/Reporting Router - credentials.md>).

## Cleanup Notes

- Covered through `useCredentials.test.ts` and `CredentialsSection.test.tsx`, which mock this namespace and answer with the bodies recorded under `client/src/test/fixtures/credentials/` (see the [tooling inventory](<../Reporting Client Tooling and Asset Inventory.md>)).

## Source

[client/src/api/credentials.ts](../../../client/src/api/credentials.ts)
