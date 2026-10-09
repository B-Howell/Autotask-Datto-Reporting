# Ticket cardStyles

> The one shared `sx` object that gives every ticket card the same flex footprint.

## Purpose

The Ticket Reports page lays its five cards out in a wrapping flex row. For the row to wrap
evenly, every card must claim the same basis, minimum and maximum width. This module holds
that single constant so the three card components cannot drift apart.

## Interface

```ts
export const TICKET_CARD_SX = { flex: '1 1 380px', minWidth: 340, maxWidth: 500 };
```

## Uses

- Nothing; it is a plain object literal.

## Used By

- [BreakdownCard](<Reporting Tickets - BreakdownCard.md>)
- [FirstCallResolutionCard](<Reporting Tickets - FirstCallResolutionCard.md>)
- [RepairTimeCard](<Reporting Tickets - RepairTimeCard.md>) indirectly, through `BreakdownCard`.

## Key Behavior

- `flex: '1 1 380px'` lets each card grow and shrink from a 380px basis; `minWidth: 340`
  stops the tables from crushing and `maxWidth: 500` stops a lone card on the last row from
  stretching across the page.
- Any new ticket card should spread this object into its `Card` `sx` rather than copy the
  numbers.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/tickets/cardStyles.ts](../../../../../client/src/pages/reports/tickets/cardStyles.ts)
