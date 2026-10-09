# Agency Utilization QuarterSelect

> The quarter dropdown on the quarterly utilization toolbar, rendering each choice with its label and a muted month-span detail.

## Purpose

A thin presentational component over an MUI select. It exists so the page can hand it the prepared `QuarterChoice[]` and a key and not know about MUI menu layout. It lives in the component layer of the Agency Utilization page folder and owns no state.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `choices` | `QuarterChoice[]` | yes | Entries from `quarterChoices()`, newest first. |
| `value` | `string` | yes | The selected `key` (`YYYY-Qn`). |
| `onChange` | `(key: string) => void` | yes | Called with the new key when the user picks an entry. |

## Uses

- `@mui/material` `TextField` (select mode), `MenuItem`, `Box`, `Typography`.
- `QuarterChoice` from [quarters](<Reporting Agency Utilization - quarters.md>).

## Used By

- [AgencyUtilization page](<../Reporting Page - AgencyUtilization.md>)

## Key Behavior

- Each menu item shows `label` (for example `Q3 2025`) followed by `detail` (the month span, with "in progress" for the current quarter) in a caption-sized secondary colour, laid out on one baseline.
- The field is `size="small"` with a 260px minimum width so the detail text does not wrap in the closed state.
- The component is fully controlled: it never stores the selection. The page falls back to the first choice if `value` does not match any key.
- The field label is "Quarter".

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/agencyUtilization/QuarterSelect.tsx](../../../../../client/src/pages/reports/agencyUtilization/QuarterSelect.tsx)
