# credentialValues

> Pure helpers behind a credential card: what a card sends, and which field carries its latest test.

## Purpose

`credentialValues.ts` holds the two small computations the vendor card needs that do not
touch React: reducing what was typed to what is worth sending, and finding the vendor's most
recent connection test among its fields. Keeping them out of the component makes the blank
handling and the tie-break testable on their own.

## Interface

| Export | Type | Description |
|---|---|---|
| `typedValues` | `(values: CredentialValues) => CredentialValues` | The trimmed, non-blank entries only. |
| `latestTest` | `(fields: CredentialFieldStatus[]) => CredentialFieldStatus \| null` | The field with the greatest `last_tested_at`, or null when none was tested. |

## Uses

- [API types](<../../api/Reporting API - types.md>) for `CredentialValues`, `CredentialFieldName` and `CredentialFieldStatus`.

## Used By

- [VendorCredentialsCard](<Reporting Settings - VendorCredentialsCard.md>)

## Key Behavior

- `typedValues` trims each value and drops the ones left empty, because the server reads a
  blank as "keep what is stored" and every value sent joins the redaction list applied to a
  vendor's refusal; the card's Save button is enabled only when the result is non-empty.
- `latestTest` skips fields whose `last_tested_at` is null and compares the rest as text,
  which is safe because the stamps are ISO strings written by one server. On a tie the field
  listed first wins, so a vendor whose rows were all stamped by the same test reports the
  outcome of its first field; the server stamps every field of a probed vendor with the same
  result, so the fields agree.

## Cleanup Notes

- Covered by `credentialValues.test.ts`.

## Source

[client/src/pages/settings/credentialValues.ts](../../../../client/src/pages/settings/credentialValues.ts)
