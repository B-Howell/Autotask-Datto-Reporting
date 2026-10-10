# useCredentials

> Hook that loads the vendor credential status and exposes the test, save and forget actions the Settings section takes on it, with every toast raised here.

## Purpose

`useCredentials` is the only stateful logic behind the Vendor credentials section. It fetches
`GET /api/credentials` once on mount and wraps the write routes and the delete so the cards
never touch the api namespace. It is a local hook rather than a store because the status matters only on
the Settings page, and nothing polls it: the status changes only through this page's own
saves and tests.

## Interface

Returns `{ status, loading, error, unreadable, reload, test, save, forget, busy }`:

| Name | Type | Description |
|---|---|---|
| `status` | `CredentialsStatus \| null` | The latest status; null until the first fetch answers or while it has failed. |
| `loading` | `boolean` | True until the first fetch settles, either way. |
| `error` | `string \| null` | The detail of a failed fetch, cleared by a fetch that succeeds. |
| `unreadable` | `boolean` | True when the last fetch failed with the 503 for stored values the key cannot read (`isUnreadable`); false for any other failure and after a fetch that succeeds. |
| `reload` | `() => Promise<void>` | Fetches the status again; the section's Retry button calls it. |
| `test` | `(values: CredentialValues) => Promise<ConnectionTestResult>` | Probes both vendors, then reloads the status; rejects with the server's detail. |
| `save` | `(values: CredentialValues) => Promise<void>` | Saves and replaces `status` from the response, toasting `Credentials saved`; a refusal is toasted as an error and rethrown. |
| `forget` | `() => Promise<void>` | Removes every stored value, toasts `Stored credentials forgotten` and reloads the status; a refusal is toasted as an error and swallowed. |
| `busy` | `boolean` | True while a test (including its reload), a save or a forget (including its reload) is in flight. |

## Uses

- `react` (`useState`, `useEffect`, `useCallback`).
- [credentials API](<../../api/Reporting API - credentials.md>) for `fetchCredentials`, `testCredentials`, `saveCredentials`, `forgetCredentials` and `isUnreadable`.
- [toastStore](<../../store/Reporting Store - toastStore.md>) for the save and forget toasts.
- [reportJob util](<../../utils/Reporting Util - reportJob.md>) for `errorMessage`.
- [API types](<../../api/Reporting API - types.md>) for `CredentialsStatus`, `CredentialValues` and `ConnectionTestResult`.

## Used By

- [CredentialsSection](<Reporting Settings - CredentialsSection.md>)

## Key Behavior

- `reload` is memoised and run once from an effect; a failed fetch lands its message in
  `error` with the fallback `The credential status could not be loaded`, sets `unreadable`
  from `isUnreadable`, and leaves `status` as it was, so a later `reload` that succeeds clears
  the banner. `unreadable` is kept apart from `error` because the section offers the forget
  action only for that one failure: a network error or a 500 shows Retry alone.
- `test` awaits `reload` after the probe before resolving, because the server stamps the
  outcome on the stored rows of every vendor it probed, changed or not; the card's last-test
  row therefore agrees with the chips it shows. A reload that fails lands in `error` like any
  other, with the probe's result still returned.
- `save` is the one place that toasts: `Credentials saved` on success, and the server's detail
  (or `The credentials were not saved`) as an error on a rejection, which is rethrown so the
  card can show the same detail as a chip. A rejected save leaves `status` untouched.
- A save that goes through uses the status the PUT returns instead of fetching again, so the
  helper texts and last-test rows are current the moment the toast appears.
- `forget` reloads rather than keeping the status the DELETE returns, because the one time it
  matters most is when there is no status at all: the fetch failed with the 503, `error` is
  set and `status` is null. A successful `reload` clears `error`, so the banner and its
  buttons give way to the cards. A refusal (the 409 in demo mode) is toasted as an error and
  not rethrown, since the button has no chip of its own to show it.
- `test`, `save` and `forget` share one `busy` flag through `whileBusy`, which is cleared in a
  `finally`, so a rejected request re-enables the buttons too. One request runs at a time by
  design: the server probes both vendors on every call, so two overlapping probes would only
  race on the recorded outcomes.

## Cleanup Notes

- Covered by `useCredentials.test.ts`.

## Source

[client/src/pages/settings/useCredentials.ts](../../../../client/src/pages/settings/useCredentials.ts)
