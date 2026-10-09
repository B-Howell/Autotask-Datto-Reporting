# AddAgencyForm

> The three-field inline form that creates a new agency (Autotask company id plus Datto site uid).

## Purpose

`AddAgencyForm` is the bottom half of the Agencies card on the Settings page. It collects the
company name, the numeric Autotask company id and the Datto site uid, validates them locally,
and hands a complete `Agency` to its parent. It owns only its three text values; persistence
is the parent's job, which keeps the form reusable and easy to test in isolation.

Duplicate detection is injected as a predicate rather than done here, because only the parent
knows the configured list.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `isDuplicate` | `(id: number) => boolean` | yes | Returns true when the id is already configured; the form then keeps its values and does nothing. |
| `onAdd` | `(agency: Agency) => void` | yes | Receives the trimmed, validated agency. |

Default export: `AddAgencyForm`.

## Uses

- `react` (`useState`) and Material UI `TextField`, `Button`, `Box`, `Typography`.
- [API types](<../../api/Reporting API - types.md>) for `Agency`.

## Used By

- [AgenciesSection](<Reporting Settings - AgenciesSection.md>)

## Key Behavior

- `handleAdd` converts the id with `Number(id)` and returns early when the name is blank after
  trimming, the id is not a non-zero number, or the site is blank after trimming. There is no
  visible validation message; the button simply does nothing.
- A duplicate id (per `isDuplicate`) also returns early without clearing the fields, so the
  user can correct the id rather than retype everything.
- On success the three fields are reset to empty strings after `onAdd` is called.
- The id field is `type="number"` but stored as a string until submit, so a cleared field is
  an empty string rather than `NaN`.
- Layout is a wrapping flex row: name `1 1 160px`, id `0 0 100px`, site `1 1 200px`, and a
  small contained "Add" button.

## Cleanup Notes

- Silent rejection: an invalid or duplicate entry gives no feedback. A helper text or toast
  would make the rule discoverable.
- No test covers the validation rules.

## Source

[client/src/pages/settings/AddAgencyForm.tsx](../../../../client/src/pages/settings/AddAgencyForm.tsx)
