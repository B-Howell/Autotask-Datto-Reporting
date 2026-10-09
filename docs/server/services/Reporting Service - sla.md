# SLA service

> Monthly SLA performance across every agency: one cached row per closed SLA ticket in `sla_ticket_rows`, with the full processed ticket in `data_json`, rebuilt into tickets, company groups and a per-resource pivot.

## Purpose

Autotask's SLA engine stamps each ticket with its first-response, resolution-plan and resolved due times, so "met" is a comparison of actual against due rather than a recomputation of the contract. This service pulls every SLA ticket completed in a month, scores it, and stores it with everything the report page needs, so re-rendering the month is a cache read. Scope is the month alone; the report covers all companies and the client filters.

## Interface

| Name | Description |
|---|---|
| `snapshot(year, month)` | `Snapshot("sla", "sla_ticket_rows", {year, month})`. |
| `business_hours_between(start, end)` | Business hours (Monday to Friday, within `BUSINESS_HOURS`) between two datetimes, rounded to two decimals. |
| `fetch_rows(year, month, logger)` | One row per ticket: `ticket_id, company_id, company_name, sla_name, priority_id, resource, first_response_met, resolved_met, data_json`. |
| `aggregate(rows, year, month)` | `{tickets, companies, grouped, pivot, slaTargets, month, year}`. |
| `get_sla_report(year, month, logger, refresh)` | Read-through; adds `synced_at`. |
| `refresh_snapshot(year, month, logger)` | Fetch and store, ignoring the cache. |
| `SLA_PHASES` | Collecting tickets, Looking up staff, Building the report. |

## Uses

- Standard library `json`, `collections.defaultdict`, `datetime.timedelta`.
- [config](<../Reporting Server - config.md>) (`settings.demo_mode`), [progress core](<../core/Reporting Core - progress.md>), [autotask integration](<../integrations/Reporting Integration - autotask.md>)
- [report_rules](<../Reporting Server - report_rules.md>) (`BUSINESS_HOURS`, `SLA_NO_METRICS_PRIORITY`, `SLA_TARGETS`, `TICKET_PRIORITY_LABELS`)
- [snapshots repository](<../repositories/Reporting Repository - snapshots.md>) and [common helpers](<Reporting Service - common.md>)

## Used By

- [sla router](<../routers/Reporting Router - sla.md>)
- [sync service](<Reporting Service - sync.md>) (refreshes the current month only)
- [demo data](<../demo/Reporting Demo - data.md>) imports `SLA_PHASES` and produces rows in this shape.
- `server/tests/test_aggregates.py` runs `aggregate` over demo rows.

## Key Behavior

- Ticket query: `completedDate` in the month (exclusive upper bound), `serviceLevelAgreementID > 0`, `priority` not equal to `SLA_NO_METRICS_PRIORITY`, with `TICKET_FIELDS` requested, walked with the id cursor.
- Staff lookup fetches active and inactive resources, because a ticket closed this month may belong to someone who has since left; names are `Last, First`. Company names are one chunked lookup, with `Company <id>` as the placeholder for an id Autotask no longer returns.
- Processed ticket (`data_json`): ticket number, title, create, SLA start (equal to create) and complete dates as `MM/DD/YYYY`, resource, picklist labels for queue, status, priority, ticket type, ticket category, issue type and sub-issue type, the metrics `firstResponseHours`, `firstResponseMet`, `resolutionPlanHours`, `resolutionPlanMet`, `resolvedHours`, `resolvedMet`, `waitingCustomerHours`, plus `_resourceId`, `_companyId`, `_slaId`, `_priorityId` and `companyName`.
- Scoring: elapsed hours are business hours from ticket creation to the event; `met` is `actual <= due`, or None when either timestamp is missing or the priority is the no-metrics one. The queryable columns `first_response_met` and `resolved_met` store that tri-state as 1, 0 or NULL.
- Business hours: the loop skips weekend days to the next Monday, clips each weekday to `BUSINESS_HOURS` (8 to 17 by default), and sums the overlaps; the result is 0 when `end <= start`.
- `aggregate`: tickets are decoded from `data_json`; `companies` maps company id strings to names; `grouped` is `{company name: {sla name: [tickets]}}` with companies sorted; `pivot` has one row per resource (sorted, `(blank)` for unassigned) with `avgFirstResponseMet`, `avgResolvedMet` and `ticketCount`, followed by a `Grand Total` row, ignoring tickets at the no-metrics priority and metrics that are None. `slaTargets` maps the priority label to `{response, resolution}` hours.
- Priority labels in `aggregate` come from `TICKET_PRIORITY_LABELS` in demo mode and from the cached Autotask picklist otherwise, so the demo never touches the API; every other label was resolved at fetch time and stored.
- Picklist labels for unknown values fall back to the raw value as a string, and to `""` for None; a missing SLA id is labelled `No SLA`.

## Cleanup Notes

- `_resource_pivot` counts `ticketCount` as the larger of the two metric lists, so a ticket with only one judgeable metric still counts once, but a ticket with neither is invisible in the pivot while present in `tickets`.
- `BUSINESS_HOURS` are applied to timestamps parsed as UTC, so the business day is effectively 08:00 to 17:00 UTC unless the tenant is in that zone.

## Source

[server/services/sla.py](../../../server/services/sla.py)
