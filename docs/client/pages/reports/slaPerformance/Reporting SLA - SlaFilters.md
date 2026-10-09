# SlaFilters

> The filter bar above the SLA tabs: one checkbox multi-select per filter key and a Clear button when any filter is active.

## Purpose

The SLA report is fetched for the whole month across every company, so narrowing it happens on the client. This component lays out the four filters defined by `SLA_FILTERS` and offers a single Clear action. It holds no state; values, options and handlers all come from `useSlaFilters` through the page. Presentational, page layer.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `values` | `SlaFilterValues` | yes | Current selection per key; empty array means no filter. |
| `options` | `SlaFilterValues` | yes | Distinct values per key, from the fetched tickets. |
| `hasActive` | `boolean` | yes | Whether any key has a selection; shows the Clear button. |
| `onChange` | `(key: SlaFilterKey, selected: string[]) => void` | yes | Selection change for one key. |
| `onClear` | `() => void` | yes | Resets every key. |

## Uses

- `@mui/material` (`Paper`, `Button`).
- [CheckboxFilter](<Reporting SLA - CheckboxFilter.md>).
- `SLA_FILTERS` and the `SlaFilterKey`, `SlaFilterValues` types from [useSlaFilters](<Reporting SLA - useSlaFilters.md>).

## Used By

- [SlaPerformance page](<../Reporting Page - SlaPerformance.md>), rendered once data has loaded.

## Key Behavior

- Filters render in `SLA_FILTERS` order: Company, Queue, Priority, Resource. Adding a filter means adding an entry there; this component needs no change.
- The bar is a flex `Paper` with wrapping, so the four controls share a row on wide screens and stack on narrow ones.
- The Clear button is only mounted while `hasActive` is true, so an untouched report shows no clear control.
- Options are not re-derived from the filtered set; each control always lists every distinct value in the fetched month, so choosing a company does not shrink the resource list.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/slaPerformance/SlaFilters.tsx](../../../../../client/src/pages/reports/slaPerformance/SlaFilters.tsx)
