# Agency Utilization UtilizationTable

> The on-screen matrix of engineer hours by company for one quarter, grouped under collapsible department rows with department, company and grand totals.

## Purpose

Renders a `UtilizationReport` as a sticky-header MUI table: one column per company plus a Grand Total column, one bold row per billing category (department) with the people who booked time in that category beneath it. It is the quarterly report's only result view. It lives in the component layer of the Agency Utilization folder and keeps only the collapsed state of each department locally.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `report` | `UtilizationReport` | yes | The server payload: `categories`, `companies`, `rows`, `categoryTotals`, `companyTotals`, `grandTotal`. |

Internal components (not exported): `HoursCells` renders the per-company cells plus a total cell; `CategoryRows` renders one department header row and its worker rows.

## Uses

- `@mui/material` table primitives, `IconButton`, and the `KeyboardArrowDown` / `KeyboardArrowRight` icons.
- [grouping](<Reporting Agency Utilization - grouping.md>) for `groupRowsByCategory` and `sumHours`.
- [quarters](<Reporting Agency Utilization - quarters.md>) for `fmtHours`.
- `UtilizationReport`, `UtilizationRow` types from [API types](<../../../api/Reporting API - types.md>).

## Used By

- [AgencyUtilization page](<../Reporting Page - AgencyUtilization.md>)

## Key Behavior

- Column order is Department, Resource, then `report.companies` in the server's order (alphabetical with the internal label last), then Grand Total.
- Department rows iterate `report.categories`, so a category with totals but no rows still renders a header; worker rows come from `groupRowsByCategory(report.rows)` and are memoised on `report.rows`.
- Department totals come from `report.categoryTotals[category]` (server-rounded); the department's Grand Total cell is `sumHours` of those, and each worker's Grand Total is `sumHours` of their `byCompany`. The bottom Grand Total row uses `report.companyTotals` and `report.grandTotal` directly.
- Zero and missing hours render as blank cells via `fmtHours`, so the matrix reads sparsely.
- Collapse state is a `Record<category, boolean>` in component state; everything starts expanded, and the state is lost on unmount (it is not in the store).
- Department header rows and the grand total row get a translucent blue background with separate alpha values for light and dark palettes; department totals are weight 700, grand totals 800.
- The container is capped at `calc(100vh - 280px)` with `stickyHeader`, so long reports scroll inside the page rather than the window.

## Cleanup Notes

- The collapse toggle has no accessible label on the `IconButton`.
- No tests cover the totals maths or the collapse behaviour.

## Source

[client/src/pages/reports/agencyUtilization/UtilizationTable.tsx](../../../../../client/src/pages/reports/agencyUtilization/UtilizationTable.tsx)
