# FirstCallResolutionCard

> The ticket card that shows the first-call resolution percentage for phone tickets, or N/A.

## Purpose

`FirstCallResolutionCard` is the one ticket card that is a single headline figure rather than
a table. It shows the percentage of phone tickets resolved on first contact and, beneath it,
the fraction it was computed from. It handles the absent case itself so the page can render
it unconditionally.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `resolution` | `FirstCallResolution \| null \| undefined` | yes | `{ percentage, phone_tickets_fcr, phone_tickets_total }` or nothing. |

Default export: `FirstCallResolutionCard`.

## Uses

- Material UI `Card`, `CardContent`, `Box`, `Typography`.
- [cardStyles](<Reporting Tickets - cardStyles.md>) for `TICKET_CARD_SX`.
- [API types](<../../../api/Reporting API - types.md>) for `FirstCallResolution`.

## Used By

- [Tickets page](<../Reporting Page - Tickets.md>)

## Key Behavior

- With a value: an `h2`, bold, monospace, `primary.main` headline of `<percentage>%` and a
  caption `<fcr> of <total> phone tickets`. The percentage is printed as received; the
  component does no rounding.
- Without a value: the headline is `N/A` and the caption `No phone tickets found`.
- The headline block is centred with vertical padding of 3, so the card is roughly the same
  height as the table cards beside it.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/tickets/FirstCallResolutionCard.tsx](../../../../../client/src/pages/reports/tickets/FirstCallResolutionCard.tsx)
