# CheckboxFilter

> A multi-select autocomplete with checkboxes and a synthetic "All" entry, used for each SLA filter.

## Purpose

The SLA page filters tickets by company, queue, priority and resource. Each filter needs the same control: a compact multi-select where "nothing selected" reads as "All" rather than as "none". This component wraps MUI `Autocomplete` to provide that semantics so the filter hook can keep the simple rule that an empty array means no filter. Presentational, page layer.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `label` | `string` | yes | Field label. |
| `options` | `string[]` | yes | Distinct values offered, already sorted by the hook. |
| `value` | `string[]` | yes | Selected values; empty means no filter. |
| `onChange` | `(v: string[]) => void` | yes | Called with the new selection, never containing the All sentinel. |

## Uses

- `@mui/material` (`Autocomplete`, `Checkbox`, `TextField`).

## Used By

- [SlaFilters](<Reporting SLA - SlaFilters.md>), once per entry of `SLA_FILTERS`.

## Key Behavior

- The option list is `['@@ALL@@', ...options]`; the sentinel is labelled "All" and its checkbox is checked exactly when `value` is empty.
- Picking "All" while a filter is active clears the selection (`onChange([])`). Picking it when already on All is a no-op after the sentinel is filtered out. Any other change passes the selection through minus the sentinel.
- The displayed value is `[]` whenever `allSelected`, so no chip is shown for All; the input placeholder reads "All" instead.
- `disableCloseOnSelect` keeps the popup open for ticking several values; `limitTags={2}` collapses chips beyond two into a "+n" marker.
- `renderOption` pulls `key` out of the option props before spreading because React 19 rejects `key` arriving via spread.
- Minimum width 220px with `flex: 1`, so the four filters share a row and wrap on narrow screens.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/slaPerformance/CheckboxFilter.tsx](../../../../../client/src/pages/reports/slaPerformance/CheckboxFilter.tsx)
