# CredentialsSection

> The first Settings card: where an operator enters, tests, saves and, when needed, forgets the Autotask and Datto API credentials.

## Purpose

`CredentialsSection` is the top card on the Settings page because a fresh install needs
vendor keys before any report, sync or agency lookup can work. It composes the state of
`useCredentials` into one explanatory card: a line naming where the master key comes from, a
demo mode notice when the server simulates the vendors, a retry and a forget when the status
cannot be read, one `VendorCredentialsCard` per vendor, and a forget below the cards while
anything is stored. It owns no state of its own.

## Interface

`CredentialsSection` takes no props and is the module's default export.

From `useCredentials` it consumes `status`, `loading`, `error`, `unreadable`, `reload`,
`test`, `save`, `forget` and `busy`.

## Uses

- Material UI `Paper`, `Typography`, `Box`, `Button` and the `Refresh` icon.
- [ForgetCredentialsButton](<Reporting Settings - ForgetCredentialsButton.md>), once beside Retry and once below the cards.
- [useCredentials](<Reporting Settings - useCredentials.md>) for the status and the actions.
- [VendorCredentialsCard](<Reporting Settings - VendorCredentialsCard.md>), once per entry of `VENDORS`.
- [vendors](<Reporting Settings - vendors.md>) for `VENDORS`, `vendorFields` and `hasStoredField`.
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
- A failed load shows the detail in `ErrorBanner` with a `Retry` button that calls `reload`;
  no cards render until a status has arrived, and the banner and its buttons go away once a
  fetch succeeds. `LoadingRow` shows only while the first fetch is in flight.
- `Forget stored credentials` joins Retry only while `unreadable` is true, the 503 for stored
  values the key cannot read. That is the recovery path after a lost or replaced master key:
  the server cannot show the rows or accept a save over them, but it can delete them. A
  network failure or a 500 shows Retry alone, so a transient error never invites an operator
  to delete credentials that are still readable. The button there is never disabled for demo
  mode, because without a status the section does not know the mode; the server answers 409
  and the hook toasts it.
- Below the cards the same button appears only while no error is showing and
  `hasStoredField` finds a field whose `source` is `stored`; it is disabled in demo mode like
  the cards. Environment-sourced fields do not count, because forgetting cannot touch them.
  Tying it to the error-free state means a reload that fails after a test, when the cards
  still show the earlier status beside the banner, offers the button once, beside Retry.
  Confirming calls the hook's `forget`, which toasts and reloads, so the button disappears
  with the rows it removed.

## Cleanup Notes

- Covered by `CredentialsSection.test.tsx`, which renders the section with the api namespace mocked.

## Source

[client/src/pages/settings/CredentialsSection.tsx](../../../../client/src/pages/settings/CredentialsSection.tsx)
