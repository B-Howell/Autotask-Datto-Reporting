# LoadingRow

> A small spinner beside a short message, shown where a list will appear once it has loaded.

## Purpose

The Scheduled Reports and Saved Reports pages both wait on one fetch before they can show a table, and both showed the same twenty-pixel spinner with the word "Loading" in a padded row. `LoadingRow` is that row, so the two pages (and any later list page) render the same thing from one line.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `message` | `string` | no | The text beside the spinner; defaults to `Loading…`. |

Default export: `LoadingRow`.

## Uses

- `@mui/material` `Box`, `CircularProgress` and `Typography`.

## Used By

- Re-exported by [the report component barrel](<Reporting Report Component - index.md>).
- [ScheduledReports page](<../../pages/Reporting Page - ScheduledReports.md>) while the first schedule refresh is in flight.
- [SavedReports page](<../../pages/reports/Reporting Page - SavedReports.md>) while the saved-report list loads.

## Key Behavior

- A flex row with `gap: 2` and `p: 3`, the spinner at `size={20}`: the same footprint as the table header it is standing in for, so the page does not jump when the table arrives.
- It is a row, not an overlay: the page decides what else stays visible (the Scheduled Reports page keeps its pre-flight row and error banner above it).

## Cleanup Notes

- None noted.

## Source

[client/src/components/report/LoadingRow.tsx](../../../../client/src/components/report/LoadingRow.tsx)
