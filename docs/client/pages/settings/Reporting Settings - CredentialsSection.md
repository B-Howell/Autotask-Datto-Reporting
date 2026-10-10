# CredentialsSection

> The first Settings card: where an operator enters, tests and saves the Autotask and Datto API credentials.

## Purpose

`CredentialsSection` is the top card on the Settings page because a fresh install needs
vendor keys before any report, sync or agency lookup can work. It composes the state of
`useCredentials` into one explanatory card: a line naming where the master key comes from, a
demo mode notice when the server simulates the vendors, a retry when the status cannot be
read, and one `VendorCredentialsCard` per vendor. It owns no state of its own.

## Interface

`CredentialsSection` takes no props and is the module's default export.

From `useCredentials` it consumes `status`, `loading`, `error`, `reload`, `test`, `save` and
`busy`.

## Uses

- Material UI `Paper`, `Typography`, `Button` and the `Refresh` icon.
- [useCredentials](<Reporting Settings - useCredentials.md>) for the status and the actions.
- [VendorCredentialsCard](<Reporting Settings - VendorCredentialsCard.md>), once per entry of `VENDORS`.
- [vendors](<Reporting Settings - vendors.md>) for `VENDORS` and `vendorFields`.
- [ErrorBanner](<../../components/report/Reporting Report Component - ErrorBanner.md>) and [LoadingRow](<../../components/report/Reporting Report Component - LoadingRow.md>) from the report component barrel.
- [API types](<../../api/Reporting API - types.md>) for `CredentialsStatus`.

## Used By

- [Settings page](<../Reporting Page - Settings.md>)

## Key Behavior

- The card is a `section` labelled by its `Vendor credentials` heading through
  `aria-labelledby`, so it is a named region for assistive technology; each vendor card is a
  nested region of its own.
- The master key line reads `Master key: from APP_SECRET_KEY` when `keySource` is
  `environment` and `Master key: from the data directory key file` when it is `file`, so an
  operator knows which key a backup must carry.
- In demo mode the caption `Demo mode simulates the vendor clients; credentials are not
  used.` appears in the warning colour and both cards are passed `disabled`, which disables
  every input and button; the server would answer 409 to a test or save anyway.
- Each card receives its vendor's fields through `vendorFields`, in the order `vendors.ts`
  declares, and shares the hook's `busy` flag so a probe of one vendor disables both cards'
  buttons.
- A failed load (for example the 503 when stored values cannot be decrypted) shows the detail
  in `ErrorBanner` with a `Retry` button that calls `reload`; no cards render until a status
  has arrived, and the banner and button go away once a fetch succeeds. `LoadingRow` shows
  only while the first fetch is in flight.

## Cleanup Notes

- Covered by `CredentialsSection.test.tsx`, which renders the section with the api namespace mocked.

## Source

[client/src/pages/settings/CredentialsSection.tsx](../../../../client/src/pages/settings/CredentialsSection.tsx)
