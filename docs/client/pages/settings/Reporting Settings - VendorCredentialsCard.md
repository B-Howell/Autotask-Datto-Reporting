# VendorCredentialsCard

> One vendor's credential fields with a connection test and a save, owning only what has been typed and which button is in flight.

## Purpose

`VendorCredentialsCard` is the unit the Vendor credentials section repeats for Autotask and
Datto. It lists the vendor's fields through `CredentialField`, keeps the values typed into
them, and offers two actions: test the connection with those values laid over the stored
ones, and save them. The outcome of either action is shown as chips inside the card, so an
operator sees the vendor's answer beside the inputs it concerns. Toasts are not raised here;
the hook owns them.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `vendor` | `CredentialVendor` | yes | Picks the title and the heading id that labels the card's region. |
| `fields` | `CredentialFieldStatus[]` | yes | The vendor's fields, rendered in the order given. |
| `disabled` | `boolean` | yes | Disables every input and button (demo mode). |
| `busy` | `boolean` | yes | Disables both buttons while any card's test or save is in flight; inputs stay editable. |
| `onTest` | `(values: CredentialValues) => Promise<ConnectionTestResult>` | yes | Probes both vendors; a rejection's message becomes a failed outcome. |
| `onSave` | `(values: CredentialValues) => Promise<void>` | yes | Saves; resolves once the status is replaced, rejects with the server's detail. |

Default export: `VendorCredentialsCard`.

## Uses

- `react` (`useState`) and Material UI `Paper`, `Stack`, `Box`, `Button`, `CircularProgress`, `Typography`.
- [CredentialField](<Reporting Settings - CredentialField.md>) for each input.
- [ConnectionOutcomeChips](<Reporting Settings - ConnectionOutcomeChips.md>) for the outcome and its `ConnectionOutcome` type.
- [credentialValues](<Reporting Settings - credentialValues.md>) for `typedValues` and `latestTest`.
- [vendors](<Reporting Settings - vendors.md>) for `VENDOR_LABELS`.
- [dates util](<../../utils/Reporting Util - dates.md>) for `formatDateTime` and the [reportJob util](<../../utils/Reporting Util - reportJob.md>) for `errorMessage`.
- [API types](<../../api/Reporting API - types.md>) for `CredentialVendor`, `CredentialFieldStatus`, `CredentialValues` and `ConnectionTestResult`.

## Used By

- [CredentialsSection](<Reporting Settings - CredentialsSection.md>)

## Key Behavior

- The card is a `section` whose `aria-labelledby` points at its `h3` (`<vendor>-credentials-heading`),
  so each vendor is a named region and the tests address a card by its name.
- Inputs start blank and the caption `Leave a field blank to keep its stored value` sits
  under them. What a test or save sends is `typedValues`: the trimmed, non-blank entries
  only. Save is disabled while that is empty; Test connection stays enabled, because testing
  the stored keys as they are is useful on its own.
- The pressed button shows a 16px spinner as its start icon and reads `Testing…` or
  `Saving…` until its promise settles (local `pending` state), while `busy` from the hook
  disables both buttons of both cards; the inputs are never disabled by activity, so an
  operator can keep typing while a probe runs.
- A test records `{ kind: 'tested', result }` and leaves the typed values in place; the hook
  reloads the status behind it, so the last-test row catches up with the chips. A save that
  goes through clears the inputs and the outcome; the status the hook keeps from the response
  updates the helper texts and the last-test row.
- A rejection from either action becomes `{ kind: 'failed', message }` with the server's
  detail (or a fallback sentence when the error carries none); the inputs are kept so the
  value can be corrected. Only the hook toasts.
- The last-test row reads `Last test passed, <when>` or `Last test failed, <when>` from
  `latestTest(fields)`; it is absent until a stored row has been tested.

## Cleanup Notes

- Covered by `CredentialsSection.test.tsx`.

## Source

[client/src/pages/settings/VendorCredentialsCard.tsx](../../../../client/src/pages/settings/VendorCredentialsCard.tsx)
