# Annual Utilization ReportTabs

> The tab strip above the annual report: Summary and Datto, a visual divider, then one tab per selected agency.

## Purpose

The annual report has two fixed views and one per agency. This component renders that strip as a scrollable MUI `Tabs` and maps tab values onto the store's `tab` string. It is a stateless presentational component in the Annual Utilization folder.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `string` | yes | `''` (Summary), `RAW_TAB` (Datto) or an agency name. |
| `onChange` | `(tab: string) => void` | yes | Called with the new tab value. |
| `companies` | `string[]` | yes | The selected agencies, one tab each, in order. |

## Uses

- `@mui/material` `Tabs`, `Tab`.
- [fiscalYear](<Reporting Annual Utilization - fiscalYear.md>) for `RAW_TAB`.

## Used By

- [AnnualUtilization page](<../Reporting Page - AnnualUtilization.md>)

## Key Behavior

- Tab values double as the store's tab key: the Summary tab's value is the empty string, the raw sheet's is the `'__datto__'` sentinel, and an agency tab's value is the agency name itself.
- A disabled, zero-width tab with value `'__divider__'` draws a vertical rule between the fixed tabs and the agency tabs; its opacity is forced to 1 so it does not look greyed out, and `onChange` ignores it so it can never become selected.
- `variant="scrollable"` with automatic scroll buttons handles long agency lists.
- Keyboard navigation can still land on the divider as a focus stop because it is a real `Tab`, though selecting it does nothing.

## Cleanup Notes

- The divider is a `Tab` used for layout; a non-tab separator would avoid the special case in `onChange`.

## Source

[client/src/pages/reports/annualUtilization/ReportTabs.tsx](../../../../../client/src/pages/reports/annualUtilization/ReportTabs.tsx)
