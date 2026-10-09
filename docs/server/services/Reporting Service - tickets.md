# Tickets service

> Monthly ticket breakdown for one agency: one cached row per ticket in `ticket_rows`, with every count, repair time and first-call figure recomputed from those rows.

## Purpose

The monthly ticket report shows volume by source, priority and issue type, average time to repair per priority, and first-call resolution for phone tickets. All of it derives from the same normalised ticket rows, so a refresh is a single Autotask query and the payload is a pure function of what was stored. The tenant-specific picklist ids and bucket labels live in `report_rules`; this module only applies them.

## Interface

| Name | Description |
|---|---|
| `snapshot(company_id, year, month)` | `Snapshot("tickets", "ticket_rows", {company_id, year, month})`. |
| `fetch_rows(company_id, year, month, logger)` | Rows `ticket_id, source, priority, issue_type, sub_issue_type, status, create_date, completed_date, creator_resource_id, completed_by_resource_id`. |
| `count_by_category(rows, field, labels, order, default)` | `{"<label> Count": n}` over `order`, mapping each row's picklist id through `labels`. |
| `count_issue_types(rows)` | Issue-type counts with password resets also bucketed by the system the reset was for. |
| `repair_times(rows, logger)` | Per priority: `{average_days, completed_tickets}`. |
| `first_call_resolution(rows)` | `{percentage, phone_tickets_fcr, phone_tickets_total}`. |
| `aggregate(rows, logger)` | The full payload. |
| `get_ticket_details(company_id, year, month, logger, refresh)` | Read-through; adds `synced_at`. |
| `refresh_snapshot(company_id, year, month, logger)` | Fetch and store, ignoring the cache. |

## Uses

- [autotask integration](<../integrations/Reporting Integration - autotask.md>)
- [report_rules](<../Reporting Server - report_rules.md>) (source, priority and issue-type label maps and orders, password-reset ids, `TICKET_SOURCE_PHONE`, `TICKET_STATUS_COMPLETE`)
- [snapshots repository](<../repositories/Reporting Repository - snapshots.md>) and [common helpers](<Reporting Service - common.md>)

## Used By

- [tickets router](<../routers/Reporting Router - tickets.md>)
- [sync service](<Reporting Service - sync.md>) (refreshes the current month per agency)
- [demo data](<../demo/Reporting Demo - data.md>) produces rows in this shape.
- `server/tests/test_aggregates.py`

## Key Behavior

- Fetch: tickets with `companyID = company_id` and `createDate` within the calendar month (exclusive upper bound), requesting only `TICKET_FIELDS`, walked with the id cursor. Progress is log lines only; this service emits no `[PROGRESS]` phases.
- Count keys: every breakdown key is the `report_rules` label plus ` Count`, except `Password Reset` and `None`, which have always been shown bare; the client prints the keys verbatim. Every label in the order list is present even at zero, and an unknown picklist id falls into the default bucket (`Other`, `No Metrics`, `Other Issue`).
- Issue types: a password-reset ticket increments `Password Reset` and, when its sub-issue type is in `PASSWORD_RESET_SUB_ISSUE_LABELS`, the matching system bucket too, so the issue-type table's first rows sum to more than the reset count by design.
- Repair time: only tickets with `status == TICKET_STATUS_COMPLETE` and both dates parseable count; the span is `(completed - created)` in fractional days, averaged per priority and rounded to two decimals, with the number of completed tickets alongside. Unparseable dates on a completed ticket are logged at `[DEBUG]`.
- First-call resolution: among tickets whose source is the phone source, those that are complete, were completed by the same resource that created them, and were completed on the same calendar date as creation. The percentage is rounded to two decimals and is 0 when there were no phone tickets.
- Agency groups are merged on the client, which re-weights these averages by ticket count; the server never sees a group.

## Cleanup Notes

- No `Phases` are emitted, so the status bar shows this report as a single unnamed phase; the other services all declare phases.

## Source

[server/services/tickets.py](../../../server/services/tickets.py)
