# useCredentials

> Hook that loads the vendor credential status and exposes the test and save actions the Settings cards take on it.

## Purpose

`useCredentials` is the only stateful logic behind the Vendor credentials section. It fetches
`GET /api/credentials` once on mount and wraps the two write routes so the cards never touch
the api namespace. It is a local hook rather than a store because the status matters only on
the Settings page, and nothing polls it: the status changes only through this page's own
saves and tests.

## Interface

Returns `{ status, loading, error, reload, test, save, busy }`:

| Name | Type | Description |
|---|---|---|
| `status` | `CredentialsStatus \| null` | The latest status; null until the first fetch answers or while it has failed. |
| `loading` | `boolean` | True until the first fetch settles, either way. |
| `error` | `string \| null` | The detail of a failed fetch, cleared by a fetch that succeeds. |
| `reload` | `() => Promise<void>` | Fetches the status again. |
| `test` | `(values: CredentialValues) => Promise<ConnectionTestResult>` | Probes both vendors; rejects with the server's detail. |
| `save` | `(values: CredentialValues) => Promise<void>` | Saves, replaces `status` from the response and toasts `Credentials saved`; rejects with the server's detail. |
| `busy` | `boolean` | True while a test or save is in flight. |

## Uses

- `react` (`useState`, `useEffect`, `useCallback`).
- [credentials API](<../../api/Reporting API - credentials.md>) for `fetchCredentials`, `testCredentials` and `saveCredentials`.
- [toastStore](<../../store/Reporting Store - toastStore.md>) for the success toast.
- [reportJob util](<../../utils/Reporting Util - reportJob.md>) for `errorMessage`.
- [API types](<../../api/Reporting API - types.md>) for `CredentialsStatus`, `CredentialValues` and `ConnectionTestResult`.

## Used By

- [CredentialsSection](<Reporting Settings - CredentialsSection.md>)

## Key Behavior

- `reload` is memoised and run once from an effect; a failed fetch lands its message in
  `error` with the fallback `The credential status could not be loaded`, and leaves `status`
  as it was, so a later `reload` that succeeds clears the banner.
- `test` and `save` share one `busy` flag through `whileBusy`, which is cleared in a
  `finally`, so a rejected request re-enables the cards too. One request runs at a time by
  design: the server probes both vendors on every call, so two overlapping probes would only
  race on the recorded outcomes.
- The actions reject rather than swallow errors so the card that asked can show the detail
  beside its own inputs; the hook toasts only the success, and the card toasts a refused save.
  A rejected save leaves `status` untouched.
- A save that goes through uses the status the PUT returns instead of fetching again, so the
  helper texts and last-test rows are current the moment the toast appears.

## Cleanup Notes

- Covered by `useCredentials.test.ts`.

## Source

[client/src/pages/settings/useCredentials.ts](../../../../client/src/pages/settings/useCredentials.ts)
