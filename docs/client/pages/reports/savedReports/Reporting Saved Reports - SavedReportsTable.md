# SavedReportsTable

> The saved-reports list: a row per stored file with type label, format chip, size, and download and delete buttons.

## Purpose

`SavedReportsTable` is the presentational table for the Saved Reports page. It renders the
already-filtered list, opens a report when a row is clicked, and exposes download (a plain
link to the server's download URL) and delete actions. It owns no state and no fetching.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `reports` | `SavedReport[]` | yes | Rows to render, in the order given. |
| `onOpen` | `(report: SavedReport) => void` | yes | Row click; the page uses it to open the viewer. |
| `onDelete` | `(id: number) => void` | yes | Delete button. |

Default export: `SavedReportsTable`.

## Uses

- Material UI `Paper`, `Table` family, `Chip`, `IconButton` and the `Download` and
  `DeleteOutline` icons.
- [savedReports API](<../../../api/Reporting API - savedReports.md>) for
  `savedReportDownloadUrl`, and [API types](<../../../api/Reporting API - types.md>) for `SavedReport`.
- [dates util](<../../../utils/Reporting Util - dates.md>) for `formatDateTime`.
- [formatBytes](<Reporting Saved Reports - formatBytes.md>) and
  [reportTypes](<Reporting Saved Reports - reportTypes.md>) (`REPORT_TYPE_LABELS`, `FORMAT_COLORS`).

## Used By

- [SavedReports page](<../Reporting Page - SavedReports.md>)

## Key Behavior

- Columns: Title, Agency, Type, Format, Saved, Size (right aligned), Actions (right aligned),
  with bold headers; table `size="small"` inside a `Paper`.
- Title falls back to `filename` when `title` is empty. Type shows the label from
  `REPORT_TYPE_LABELS` or the raw `report_type` for unknown types.
- Format is an outlined `Chip` with the format upper-cased and a colour from
  `FORMAT_COLORS` (`default` when unmapped).
- Saved uses `formatDateTime(created_at)` and does not wrap; Size uses `formatBytes`.
- Rows are `hover` with a pointer cursor and call `onOpen` on click. The actions cell stops
  click propagation so Download and Delete do not also open the viewer.
- Download is an `IconButton` rendered as an anchor whose `href` is the server download URL,
  so the browser handles the file. Delete calls `onDelete(r.id)` immediately.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/savedReports/SavedReportsTable.tsx](../../../../../client/src/pages/reports/savedReports/SavedReportsTable.tsx)
