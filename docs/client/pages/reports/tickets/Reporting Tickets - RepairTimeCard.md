# RepairTimeCard

> The "Average Time to Repair (Days)" ticket card, a preset of `BreakdownCard` keyed by priority.

## Purpose

`RepairTimeCard` adapts the server's `avg_time_to_repair` map (priority label to
`RepairTime`) into the rows `BreakdownCard` expects. It exists so the page does not repeat
the title, the column labels or the N/A rule, and so the repair-time card looks identical to
the count cards next to it.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `repairTimes` | `Record<string, RepairTime>` | yes | Priority label to `{ average_days, completed_tickets }`. |

Default export: `RepairTimeCard`.

## Uses

- [BreakdownCard](<Reporting Tickets - BreakdownCard.md>)
- [API types](<../../../api/Reporting API - types.md>) for `RepairTime`.

## Used By

- [Tickets page](<../Reporting Page - Tickets.md>), rendered only when `avg_time_to_repair`
  is truthy.

## Key Behavior

- Title `Average Time to Repair (Days)`, column label `Priority Category`, value label
  `Avg Days`.
- Each entry becomes `{ key: priority, value: average_days || 'N/A' }`. Because the check is
  a logical OR, an average of exactly `0` days also prints `N/A`.
- `completed_tickets` is not displayed.
- Row order is the object's insertion order from the server response.

## Cleanup Notes

- `average_days || 'N/A'` hides a genuine zero; `?? 'N/A'` or an explicit
  `completed_tickets === 0` check would be more accurate.

## Source

[client/src/pages/reports/tickets/RepairTimeCard.tsx](../../../../../client/src/pages/reports/tickets/RepairTimeCard.tsx)
