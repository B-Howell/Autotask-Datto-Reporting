# ColumnChooser

> Two-list dialog for choosing which grid columns are shown and in what order; changes apply only on Apply.

## Purpose

The device grid has more columns than fit on a screen. This dialog lets the user move columns between an Available list and a Showing list, reorder the showing list, and commit the result as an ordered list of field names. It is in the component layer and is generic over any `{ field, headerName }` column list, though only the device report uses it.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `open` | `boolean` | yes | Dialog visibility. |
| `onClose` | `() => void` | yes | Called on Cancel, backdrop click, and after Apply. |
| `allColumns` | `ChooserColumn[]` | yes | The full schema in its natural order. |
| `visibleFields` | `string[]` | yes | Currently shown fields, in display order. |
| `onApply` | `(fields: string[]) => void` | yes | Receives the new ordered field list. |

`ChooserColumn` is `{ field: string; headerName?: string }`, exported.

## Uses

- `react` (`useEffect`, `useState`)
- `@mui/material` dialog, list and button components
- `@mui/icons-material` arrow icons

## Used By

- [DeviceReports page](<../pages/reports/Reporting Page - DeviceReports.md>), fed by `useVisibleColumns`

## Key Behavior

- Working state is local and re-seeded from props every time the dialog opens, so Cancel discards changes and a stale selection never leaks between openings.
- The Showing list is seeded in `visibleFields` order, not schema order.
- Moving columns into Showing (single or all) inserts each at its schema position relative to what is already shown, so a re-shown column returns to where it belongs rather than the end.
- Moving columns out appends them to the end of Available.
- Move up and move down shift every selected item one place, skipping over other selected items so a contiguous selection moves as a block.
- The list buttons are disabled when there is nothing to act on; the list shows an italic placeholder when empty.
- Apply emits `visible.map(c => c.field)` then closes. The row-number column is handled by the caller, which strips it before opening and re-pins it on save.

## Cleanup Notes

- The Available list is not kept in schema order after items are hidden (they append), so its order drifts from the Showing list's insert-at-schema-position rule.

## Source

[client/src/components/ColumnChooser.tsx](../../../client/src/components/ColumnChooser.tsx)
