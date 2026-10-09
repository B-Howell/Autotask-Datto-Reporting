# IssueTypePivotTable

> The "Pivot by Issue Type" tab: issue types with their sub-issue rows folded underneath, plus a Grand Total row.

## Purpose

Issue type and sub-issue type form a two-level hierarchy, so the flat `PivotTable` does not fit. This component renders each issue type as a bold parent row with an expand arrow and, when opened, its sub-issue rows in a collapsible nested table. Expansion state is local. Presentational, page layer; the numbers come from `buildIssueTypePivot`.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `pivot` | `IssueTypePivotRow[]` | yes | Parent rows with optional `children`, ending with the Grand Total row. |

Internal pieces: `MetCells` (the three metric cells shared by parent, child and total rows) and `SubIssueRows` (the collapsible child block).

## Uses

- `@mui/material` table primitives, `Collapse`, `IconButton`; arrow icons from `@mui/icons-material`.
- `fmtPct`, `pctColor`, `grandTotalRowSx` from [formatters](<Reporting SLA - formatters.md>).
- `GRAND_TOTAL` and the `IssueTypePivotRow`, `SubIssuePivotRow` types from [pivots](<Reporting SLA - pivots.md>).

## Used By

- [SlaPerformance page](<../Reporting Page - SlaPerformance.md>), on tab index 3.

## Key Behavior

- Columns: an empty 40px toggle column, "Issue Type / Sub-Issue Type", "Average of First Response Met", "Average of Resolved Met", "Tickets". Metric cells are centred; the two percentages are coloured by `pctColor` (green at or above 95%, amber at or above 80%, red below).
- The Grand Total row is located by `issueType === GRAND_TOTAL`, pulled out of the list and rendered last with `grandTotalRowSx`; every other row is a group.
- The expand button only renders when a group has at least one child; clicking it toggles `open[issueType]`. All groups start collapsed.
- Children render inside a single full-width cell (`colSpan={5}`) containing a `Collapse` with `unmountOnExit`, holding a nested `Table` whose rows are borderless and indented (`pl: 6`).
- Parent rows are bold through `'& td': { fontWeight: 600 }`.

## Cleanup Notes

- The child rows live in a separate nested table, so their column widths are laid out independently of the parent header; metric cells of children can drift out of alignment with the headings when labels are long.

## Source

[client/src/pages/reports/slaPerformance/IssueTypePivotTable.tsx](../../../../../client/src/pages/reports/slaPerformance/IssueTypePivotTable.tsx)
