# vendors

> The vendor and field catalogue the credential cards render from: labels, card order, field order and whether anything is stored.

## Purpose

`vendors.ts` is the one place that says which vendors the Settings page shows, in what order,
which fields belong to each card and under which human label. The server lists the fields in
its own order and names them by key; this module turns that into the page's layout so the
section, the cards, the inputs and the outcome chips all agree without repeating the lists.

## Interface

| Export | Type | Description |
|---|---|---|
| `VENDOR_LABELS` | `Record<CredentialVendor, string>` | `Autotask` and `Datto`. Must match `VENDOR_LABELS` in the server's [credentials service](<../../../server/services/Reporting Service - credentials.md>), whose messages name the vendors the same way; a comment on each side points at the other and the test pins the pair. |
| `VENDORS` | `CredentialVendor[]` | The vendors in card order, derived from the label map's keys. |
| `FIELD_LABELS` | `Record<CredentialFieldName, string>` | `Username`, `Secret`, `Integration code`, `Zone API URL`, `API key`, `API secret`, `Platform`. |
| `vendorFields` | `(fields: CredentialFieldStatus[], vendor: CredentialVendor) => CredentialFieldStatus[]` | The vendor's status entries in card order, from the module-private `VENDOR_FIELDS` table; a name the server did not list is left out. |
| `hasStoredField` | `(fields: CredentialFieldStatus[]) => boolean` | True when any entry's `source` is `stored`; environment and missing fields do not count. |

## Uses

- [API types](<../../api/Reporting API - types.md>) for `CredentialVendor`, `CredentialFieldName` and `CredentialFieldStatus`.

## Used By

- [CredentialsSection](<Reporting Settings - CredentialsSection.md>) iterates `VENDORS`, picks each card's fields with `vendorFields` and shows its forget button when `hasStoredField` is true.
- [VendorCredentialsCard](<Reporting Settings - VendorCredentialsCard.md>) titles itself from `VENDOR_LABELS`.
- [ConnectionOutcomeChips](<Reporting Settings - ConnectionOutcomeChips.md>) labels one chip per entry of `VENDORS`.
- [CredentialField](<Reporting Settings - CredentialField.md>) labels its input from `FIELD_LABELS`.

## Key Behavior

- `vendorFields` walks `VENDOR_FIELDS` rather than the server's list, so the cards keep their
  layout whatever order the server serializes; a status entry under a name this module does
  not know is dropped, which is where a newly added server field surfaces as a missing input
  until it is listed here. The table is not exported: `vendorFields` is its only reader, so
  the card order has one owner.
- `hasStoredField` looks only at `source`, not `configured`, because a field the environment
  supplies is configured but has no row to forget.
- Both records are typed on the closed unions from `types.ts`, so adding a vendor or field
  name there fails the build until a label exists.

## Cleanup Notes

- Covered by `vendors.test.ts`, which also pins `VENDOR_LABELS` to the server's words.

## Source

[client/src/pages/settings/vendors.ts](../../../../client/src/pages/settings/vendors.ts)
