# Demo data generators

> Deterministic row generators for every snapshot table, seeded from their scope, so the application runs end to end with no vendor accounts.

## Purpose

With `DEMO_MODE=1` the snapshot repository routes every cache miss to `fetch_for` instead of a service's `fetch_rows`. The generators here return rows in the exact shape the real fetches return, emit the same `[PROGRESS]` phases, and pause briefly so the live-progress UI is exercised. Sizes are scaled so the estate comes to about 1,700 devices across 25 agencies, matching the real deployment. Agency names, hostnames and people are invented.

## Interface

| Name | Description |
|---|---|
| `DEMO_AGENCIES` | 25 agency dicts `{id, site, name}`. |
| `devices(company_id, site_id, logger)` | Rows for `device_rows`. |
| `office_windows(company_id, site_id, logger)` | Rows for `office_windows_counts`. |
| `patch(site_id, logger)` | Rows for `patch_rows`. |
| `hdd(company_id, logger)` | Rows for `hdd_ticket_rows`. |
| `tickets(company_id, year, month, logger)` | Rows for `ticket_rows`. |
| `sla(year, month, logger)` | Rows for `sla_ticket_rows`, all agencies. |
| `utilization(start, end, logger)` | `(rows, entries)` for `util_time_rows` and `util_entry_rows`. |
| `fetch_for(report_type, scope, logger)` | Dispatch by report type; `ValueError` for an unknown type. |
| `STEP_DELAY_SECONDS` | 0.12, the pause per simulated phase. |

## Uses

- Standard library `json`, `random`, `time`, `datetime`.
- [progress core](<../core/Reporting Core - progress.md>) (`Phases`)
- Phase name lists imported lazily from [devices](<../services/Reporting Service - devices.md>), [office_windows](<../services/Reporting Service - office_windows.md>), [patch_management](<../services/Reporting Service - patch_management.md>), [hdd_tickets](<../services/Reporting Service - hdd_tickets.md>), [sla](<../services/Reporting Service - sla.md>) and [utilization](<../services/Reporting Service - utilization.md>), plus `ROLE_TO_TIER` from [report_rules](<../Reporting Server - report_rules.md>)
- [sqlite repository](<../repositories/Reporting Repository - sqlite.md>) (`replace_scope` for the utilization entries)

## Used By

- [snapshots repository](<../repositories/Reporting Repository - snapshots.md>) through `demo/__init__.py`, which re-exports `DEMO_AGENCIES` and `fetch_for`
- [demo seed](<Reporting Demo - seed.md>)
- `server/tests/test_aggregates.py` uses these rows as recorded input for the aggregate functions.

## Key Behavior

- Determinism: every generator builds `random.Random` from a string seed made of the report and its scope (`devices:<company_id>`, `patch:<site_id>`, `hdd:<company_id>`, `tickets:<company_id>:<year>:<month>`, `sla:<year>:<month>`, `util:<start>:<end>`), so the same agency always has the same devices and the same month the same tickets, across restarts and across a sync. Nothing derives from Python's salted string hash.
- Id scheme: company ids are `1000 + i` for the 25 names in order; the Datto site uid is a synthetic UUID-shaped string built from `i + 1`; a device's `autotask_id` is `50000 + (company_id - 1000) * 1000 + n` where `n` is its index in the agency's device list; a demo ticket id is `year * 100000 + month * 1000 + (company_id % 100) * 10 + n`; an SLA ticket number is `T<year><month><company_id % 100><n>` and its `ticket_id` is that number without the `T`.
- Device counts: `15 + (agency_id * 37) % 107` per agency, between 15 and 121. `_device_records` is the one device list per agency; devices, office_windows, patch and hdd all derive from it so hostnames agree across reports. Hostnames are `<three-letter agency prefix>-LT-0001` or `-DT-0001`.
- Progress cadence: `_pace` starts a phase and sleeps `STEP_DELAY_SECONDS`; devices and office_windows additionally report their audit phase in steps of 40 devices with a half delay each; utilization logs and reports every tenth working day. A refresh is visibly working for about a second without making anyone wait.
- Picklist ids in tickets follow the tenant mappings in `report_rules` (sources 2, 4, 8, 18, 6, 17; priorities 1 to 4 and 6; issue types including 33 for password resets with a sub-issue from a fixed list), so `tickets.aggregate` labels them. About 92 percent of tickets are complete (status 5); phone tickets have a 60 percent chance of being closed in half an hour by their creator, which feeds first-call resolution.
- SLA rows are produced for every agency in one call (the real scope is the month), with met flags computed against the same hour targets as `SLA_TARGETS` and the processed ticket written to `data_json` in the real shape, `_resourceId` left None.
- Utilization entries: for each working day, each of ten fixed staff logs two to five entries, 93 percent against a random agency and the rest `Internal`; totals are grouped by `(ROLE_TO_TIER[role], resource, company)`. `fetch_for` writes the entries to `util_entry_rows` for the scope itself before returning the totals rows.
- The devices generator sets `last_seen` relative to the current time and the patch generator sets `last_reboot` likewise, so those columns are the only non-repeatable values.

## Cleanup Notes

- The `utilization` and `fetch_for` docstrings refer to `agency_utilization.fetch_raw`, a name that no longer exists; the real counterpart is `services.utilization.fetch_rows`.
- `_PRIORITY_LABELS` and the SLA hour thresholds duplicate `TICKET_PRIORITY_LABELS` and `SLA_TARGETS` from `report_rules` rather than importing them.

## Source

[server/demo/data.py](../../../server/demo/data.py)
