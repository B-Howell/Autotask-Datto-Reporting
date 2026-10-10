# ConnectionOutcomeChips

> The chips a credential card shows after a test or save: one per vendor, or the detail of a refusal.

## Purpose

`ConnectionOutcomeChips` renders a `ConnectionOutcome` as Material UI chips inside a live
status region, so the vendor's answer appears beside the inputs it concerns and is announced
to assistive technology. It owns the chip styling, including the wrapping that a sentence-long
refusal needs; the card only decides when there is an outcome to show.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `outcome` | `ConnectionOutcome` | yes | `{ kind: 'tested', result }` for both vendors' answers, or `{ kind: 'failed', message }` for a rejection's detail. |

Default export: `ConnectionOutcomeChips`. The `ConnectionOutcome` type is exported for the
card's state.

## Uses

- Material UI `Stack` and `Chip`.
- [vendors](<Reporting Settings - vendors.md>) for `VENDORS` and `VENDOR_LABELS`.
- [API types](<../../api/Reporting API - types.md>) for `ConnectionTestResult`.

## Used By

- [VendorCredentialsCard](<Reporting Settings - VendorCredentialsCard.md>)

## Key Behavior

- The root `Stack` carries `role="status"`, so a screen reader hears the outcome when it
  lands without focus moving; the card mounts the component only once there is an outcome.
- A tested outcome shows one outlined chip per vendor in `VENDORS` order, green when `ok`
  and red otherwise, labelled `<Vendor>: <message>`; both vendors appear because the server
  probes both on every test. A failed outcome is a single red chip with the message.
- Chip labels wrap (`height: auto`, normal white space) instead of clipping with an ellipsis.

## Cleanup Notes

- Covered by `CredentialsSection.test.tsx`, which queries the chips by their status role.

## Source

[client/src/pages/settings/ConnectionOutcomeChips.tsx](../../../../client/src/pages/settings/ConnectionOutcomeChips.tsx)
