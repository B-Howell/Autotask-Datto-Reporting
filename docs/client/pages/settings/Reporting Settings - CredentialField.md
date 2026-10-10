# CredentialField

> One vendor credential input whose helper text says what the server holds for it, without showing the value.

## Purpose

`CredentialField` turns a `CredentialFieldStatus` entry into a labelled text field. It knows
the human label for each field name, masks secrets, disables a field that the environment
sets, and writes the helper text from the status so the operator can tell a stored value from
a missing one without ever seeing it.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `field` | `CredentialFieldStatus` | yes | Drives the name, label, input type, helper text and the read-only state. |
| `value` | `string` | yes | What has been typed; blank means the stored value is kept. |
| `disabled` | `boolean` | no | Disables the input regardless of source; defaults to false. |
| `onChange` | `(value: string) => void` | yes | Receives the raw typed text. |

Default export: `CredentialField`.

## Uses

- Material UI `TextField`.
- [dates util](<../../utils/Reporting Util - dates.md>) for `formatDateTime`.
- [API types](<../../api/Reporting API - types.md>) for `CredentialFieldName` and `CredentialFieldStatus`.

## Used By

- [VendorCredentialsCard](<Reporting Settings - VendorCredentialsCard.md>)

## Key Behavior

- Labels: `Username`, `Secret`, `Integration code`, `Zone API URL` for Autotask and
  `API key`, `API secret`, `Platform` for Datto. The `name` attribute carries the server's
  field name.
- A field marked `secret` renders as `type="password"`; the others are plain text. Browser
  autofill is turned off so a saved browser password is not pasted into a vendor key field.
- Helper text by source: `stored` reads `Stored, ends with 1234, saved <when>` through
  `formatDateTime`, dropping the `ends with` part when `last4` is blank (the server only hints
  a value that is long enough to keep most of it unknown); `environment` reads `Set by the
  environment, read-only` and the input is disabled, since the server refuses to store a
  value that an environment variable would shadow; `missing` reads `Not configured`.

## Cleanup Notes

- Covered by `CredentialsSection.test.tsx`.

## Source

[client/src/pages/settings/CredentialField.tsx](../../../../client/src/pages/settings/CredentialField.tsx)
