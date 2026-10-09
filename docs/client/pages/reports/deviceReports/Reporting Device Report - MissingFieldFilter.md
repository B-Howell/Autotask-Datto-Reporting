# MissingFieldFilter

> The device report's "Filter" dropdown: show only end-user devices missing one, or any, editable Autotask field.

## Purpose

`MissingFieldFilter` is a controlled select in the device report toolbar. The device grid can
be narrowed to rows where a particular editable Autotask field (or any of them) is blank, which
is how an engineer finds the records that need filling in before posting changes back. The
component owns no state; it maps the store's string filter value to and from the select's
sentinel values.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `string` | yes | `''` for no filter, `'all'` for any editable field, or an editable column label. |
| `fieldLabels` | `string[]` | yes | The editable column labels offered as individual options. |
| `onChange` | `(value: string) => void` | yes | Receives `''`, `'all'` or a label. |

Default export: `MissingFieldFilter`.

## Uses

- Material UI `TextField` (select), `MenuItem`, `Checkbox`, `ListItemText`.

## Used By

- [DeviceReports page](<../Reporting Page - DeviceReports.md>), which passes
  `Object.keys(editableCols)` as the labels and the hook's `handleFilterChange` as `onChange`.

## Key Behavior

- The select cannot hold `''` as a value, so the empty filter is represented by the sentinel
  `'none'` inside the component and converted back to `''` in `onChange`. `'all'` passes
  through unchanged.
- `renderValue` shows `None` for the sentinel or any falsy value, `All (any missing field)`
  for `'all'`, and otherwise the label as given.
- Each option renders a small checkbox reflecting whether it is the current value, giving a
  single-select list the look of the column chooser without allowing multi-select.
- The field label is "Filter", width `minWidth: 260`.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/deviceReports/MissingFieldFilter.tsx](../../../../../client/src/pages/reports/deviceReports/MissingFieldFilter.tsx)
