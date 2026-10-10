# VendorCredentialsCard

> One vendor's credential fields with a connection test and a save, owning only what has been typed.

## Purpose

`VendorCredentialsCard` is the unit the Vendor credentials section repeats for Autotask and
Datto. It lists the vendor's fields through `CredentialField`, keeps the values typed into
them, and offers two actions: test the connection with those values laid over the stored
ones, and save them. The result of either action is shown as chips inside the card, so an
operator sees the vendor's answer beside the inputs it concerns.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `vendor` | `CredentialVendor` | yes | Picks the title (`Autotask` or `Datto`). |
| `fields` | `CredentialFieldStatus[]` | yes | The vendor's fields, rendered in the order given. |
| `disabled` | `boolean` | yes | Disables every input and button (demo mode). |
| `busy` | `boolean` | yes | Disables everything while a test or save is in flight. |
| `onTest` | `(values: CredentialValues) => Promise<ConnectionTestResult>` | yes | Probes both vendors; a rejection's message is shown as an error chip. |
| `onSave` | `(values: CredentialValues) => Promise<void>` | yes | Saves; resolves once the status is replaced, rejects with the server's detail. |

Default export: `VendorCredentialsCard`. The private `OutcomeChips` component renders a
tested outcome as one chip per vendor, or a failed one as a single error chip.

## Uses

- `react` (`useState`) and Material UI `Paper`, `Stack`, `Box`, `Button`, `Chip`, `Typography`.
- [CredentialField](<Reporting Settings - CredentialField.md>) for each input.
- [toastStore](<../../store/Reporting Store - toastStore.md>) to toast a refused save.
- [dates util](<../../utils/Reporting Util - dates.md>) for `formatDateTime` and the [reportJob util](<../../utils/Reporting Util - reportJob.md>) for `errorMessage`.
- [API types](<../../api/Reporting API - types.md>) for `CredentialVendor`, `CredentialFieldStatus`, `CredentialValues` and `ConnectionTestResult`.

## Used By

- [CredentialsSection](<Reporting Settings - CredentialsSection.md>)

## Key Behavior

- Inputs start blank and the caption `Leave a field blank to keep its stored value` sits
  under them. What a test or save sends is `typedValues`: the trimmed, non-blank entries
  only, so the server's redaction list stays short and nothing stored is overwritten by
  accident.
- Save is disabled while nothing has been typed for the card; Test connection stays enabled,
  because testing the stored keys as they are is useful on its own.
- A test shows both vendors' chips (the server probes both every time), green for `ok` and
  red otherwise, each labelled `<Vendor>: <message>`. The typed values stay in place.
- A save that goes through clears the inputs and any chips; the hook has already replaced the
  status, so the helper texts and the last-test row update from the response. A refused save
  keeps the inputs, shows the detail as an error chip and toasts it as an error.
- The last-test row reads `Last test passed, <when>` or `Last test failed, <when>` from the
  vendor's most recent `last_tested_at` across its fields (the server stamps every stored row
  of a probed vendor); it is absent until a stored row has been tested.
- Chip labels are allowed to wrap, since a vendor's refusal can run to a sentence.
- The card is a `section` element headed by an `h3`, which is how the tests scope their queries.

## Cleanup Notes

- Covered by `CredentialsSection.test.tsx`.

## Source

[client/src/pages/settings/VendorCredentialsCard.tsx](../../../../client/src/pages/settings/VendorCredentialsCard.tsx)
