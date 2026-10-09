# Utilization service

> Hours worked per agency over an inclusive date range, by billing tier and worker, cached as flat rows in `util_time_rows` with the individual time entries in `util_entry_rows`.

## Purpose

Quarterly and annual utilization answers "how many engineer hours did each client consume, at which tier". Every time entry in the range is pulled once; its agency comes from its ticket, or failing that from its task's project, and time with neither is the MSP's own. Its tier is the role the entry was booked under, mapped through `ROLE_TO_TIER`, so history stays put when someone changes role. The range itself is the cache key, so a quarter, the September-to-August fiscal year and an arbitrary range all cache the same way.

## Interface

| Name | Description |
|---|---|
| `parse_date(value)` | A `date`, `datetime` or `YYYY-MM-DD` string to a `date`; `ValueError` otherwise. |
| `period_label(start, end)` | `Q3 2026`, `FY 2025-26`, `2026` or `01 Jan 2026 - 15 Feb 2026`. |
| `current_fiscal_year(today=None)`, `fiscal_year_range(start_year)`, `quarter_range(year, quarter)` | Calendar helpers built on `FISCAL_START_MONTH`. |
| `snapshot(start, end)` | `Snapshot("utilization", "util_time_rows", {period_start, period_end})` after range validation. |
| `fetch_rows(start, end, logger, with_entries=False)` | Flat `{category, worker, company, hours}` rows; with `with_entries`, `(rows, entries)`. |
| `aggregate(rows, start, end)` | `{categories, companies, rows, categoryTotals, companyTotals, grandTotal, start, end, periodLabel}`. |
| `get_utilization(start, end, logger, refresh)` | Read-through; adds `synced_at`. |
| `get_entries(start, end, logger)` | The stored entries for the raw export, fetching first if the period was never built. |
| `stored_entries(start, end)` | Cached entries without their scope columns. |
| `refresh_snapshot(start, end, logger)` | Refetch totals and entries, ignoring the cache. |
| `PHASES` | Collecting time entries, Looking up staff and roles, Matching entries to agencies, Building the report. |

## Uses

- Standard library `collections.defaultdict`, `datetime`.
- [progress core](<../core/Reporting Core - progress.md>) (`emit`, used through `_report`)
- [autotask integration](<../integrations/Reporting Integration - autotask.md>)
- [report_rules](<../Reporting Server - report_rules.md>) (`FISCAL_START_MONTH`, `INTERNAL_LABEL`, `ROLE_TO_TIER`)
- [sqlite repository](<../repositories/Reporting Repository - sqlite.md>) (`replace_scope` for the entries table) and [snapshots repository](<../repositories/Reporting Repository - snapshots.md>)

## Used By

- [utilization router](<../routers/Reporting Router - utilization.md>) (`get_utilization`, `get_entries`)
- [sync service](<Reporting Service - sync.md>) (`quarter_range`, `fiscal_year_range`, `current_fiscal_year`, `period_label`, `refresh_snapshot`)
- [demo data](<../demo/Reporting Demo - data.md>) imports `PHASES` and `parse_date`.
- `server/tests/test_aggregates.py`

## Key Behavior

- Fetch pipeline, in order: `collect_time_entries` (date filter with an exclusive upper bound of the day after `end`, id cursor), `load_staff` (active and inactive resources, plus roles), `resolve_ticket_companies` (chunked lookup of ticket id, company, number, title), `resolve_task_companies` (tasks to projects to companies, only for entries with a task and no ticket), `label_entry_companies` (entry id to company name, `INTERNAL_LABEL` when nothing leads to a company), `aggregate_hours`, `flatten_rows`. An empty range returns early with no rows.
- Company id 0 is the MSP's own account and is a real company; the pipeline tests `is not None` rather than truthiness so internal projects are not lost. This is the fix behind `CACHE_VERSION` 2.
- Tier attribution: entries with zero hours, an unknown resource, or a role outside `ROLE_TO_TIER` are left out of the totals; unmapped roles are listed once in the log.
- Progress: queries are labelled (`time entries`, `resources`, `roles`, `tickets`, `tasks`, `projects`, `companies`) and `_report` maps each label to its phase and step number, so the bar moves forward in phase order even though several queries share a phase.
- Two tables, one fetch: `_cached_rows` wraps the fetch so that `fetch_rows(..., with_entries=True)` fills `util_entry_rows` with `replace_scope` before returning the totals rows for `get_cached_rows` to store. Filling them separately would page a year of time entries twice. Entry rows are `{date, company, ticket, title, resource, hours, role}` sorted by date, company and resource; `ticket` is the ticket number, else `Task <id>`, else `""`; hours keep full precision because the totals round once at the end.
- `aggregate`: tiers sorted alphabetically; workers sorted within a tier; companies alphabetical with `INTERNAL_LABEL` last; per-row `byCompany` values, `categoryTotals[tier][company]`, `companyTotals` and `grandTotal` all rounded to two decimals.
- Range validation: `end < start` raises `ValueError`, which the router maps to HTTP 400.
- `period_label` recognises a calendar quarter (three months starting January, April, July or October), the fiscal year (twelve months starting `FISCAL_START_MONTH`) and a calendar year; anything else is a day-month-year span.

## Cleanup Notes

- `get_entries` refetches whenever `stored_entries` is empty, so a range with genuinely no time entries is refetched on every raw export even though its totals snapshot is a cached empty scope.
- In demo mode the entries table is filled by the demo generator's dispatch rather than by `_cached_rows`, so the "one fetch fills both tables" rule is implemented twice.

## Source

[server/services/utilization.py](../../../server/services/utilization.py)
