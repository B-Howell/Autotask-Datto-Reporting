# BreakdownCard

> A two-column ticket card: category labels beside highlighted monospace figures.

## Purpose

`BreakdownCard` is the building block of the Ticket Reports page. Source, priority and issue
type breakdowns, and the average time to repair, are all a list of category rows with one
figure each, so one card component with configurable headings covers them. The figure cell
is monospace, bold and shaded to read as a number column at a glance.

## Interface

```ts
export interface BreakdownRow { key: string; value: ReactNode }
```

| Prop | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | yes | Card heading. |
| `columnLabel` | `string` | yes | Header of the category column. |
| `valueLabel` | `string` | no | Header of the figure column; defaults to `Count`. |
| `rows` | `BreakdownRow[]` | yes | One row per category, in the order given. |

Default export: `BreakdownCard`.

## Uses

- Material UI `Card`, `CardContent`, `Table` family and `Typography`.
- [cardStyles](<Reporting Tickets - cardStyles.md>) for `TICKET_CARD_SX`.

## Used By

- [Tickets page](<../Reporting Page - Tickets.md>) for the Source, Priority and Issue Type cards.
- [RepairTimeCard](<Reporting Tickets - RepairTimeCard.md>), which wraps it with a fixed
  title and `valueLabel`.

## Key Behavior

- The table is `size="small"`; the category column is 70% wide and the value column 30%,
  right aligned, both with bold headers.
- Value cells use `VALUE_CELL_SX`: monospace, `1.1rem`, bold, with the theme's `action.hover`
  background, so the shading adapts to light and dark mode.
- Rows are keyed by `key`, so category labels must be unique within one card.
- `value` is a `ReactNode`, which is why `RepairTimeCard` can pass `'N/A'` where a number is
  missing without changing this component.
- The card's footprint comes entirely from `TICKET_CARD_SX`.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/tickets/BreakdownCard.tsx](../../../../../client/src/pages/reports/tickets/BreakdownCard.tsx)
