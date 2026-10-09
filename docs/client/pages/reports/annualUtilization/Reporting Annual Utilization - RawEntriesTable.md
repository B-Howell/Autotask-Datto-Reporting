# Annual Utilization RawEntriesTable

> The paginated on-screen view of the raw time entries behind the annual report, with an entry count and total hours caption.

## Purpose

The Datto tab lets a user check the individual entries before sending a report. The full set for a year runs to tens of thousands of rows, so only the visible page is rendered. The component is presentational; the current page number is owned by the page because it is about this visit, not the report. It lives in the component layer of the Annual Utilization folder.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `entries` | `UtilizationEntry[]` | yes | Every entry for the range; the component slices the page itself. |
| `page` | `number` | yes | Zero-based page index. |
| `onPageChange` | `(page: number) => void` | yes | Called from the pagination control. |

## Uses

- `@mui/material` `Box`, `TablePagination`, `Typography`.
- [DataTable](<../../../components/report/Reporting Report Component - DataTable.md>) and its `DataColumn` type from the report components.
- [rawEntries](<Reporting Annual Utilization - rawEntries.md>) for `RAW_COLUMNS`, `ENTRY_ROWS_PER_PAGE`, `totalHours` and `RawColumn`.
- [summary](<Reporting Annual Utilization - summary.md>) for `hrs`.
- `UtilizationEntry` from [API types](<../../../api/Reporting API - types.md>).

## Used By

- [AnnualUtilization page](<../Reporting Page - AnnualUtilization.md>)

## Key Behavior

- The caption shows `<count> entries` (locale-formatted) and `hrs(totalHours(entries))` hours for the whole set, not the current page.
- Columns are built once at module load from `RAW_COLUMNS`; the wide title column is clipped at 360px with an ellipsis and a `title` tooltip holding the full text, and the right-aligned hours column uses tabular numerals.
- Rows shown are `entries.slice(page * 100, page * 100 + 100)`; the table has a sticky header and a 60vh maximum height.
- Page size is fixed at `ENTRY_ROWS_PER_PAGE` (100): `rowsPerPageOptions` offers only that value, so the rows-per-page selector is effectively hidden.
- The row key combines date, ticket, resource and the index within the page, so duplicate entries on one day do not collide.
- The page resets `page` to 0 whenever a new set of entries loads (keyed on `entriesFor`), not this component.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/annualUtilization/RawEntriesTable.tsx](../../../../../client/src/pages/reports/annualUtilization/RawEntriesTable.tsx)
