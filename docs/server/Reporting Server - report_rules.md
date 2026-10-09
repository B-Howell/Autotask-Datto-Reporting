# Deployment-specific reporting rules

> The single module holding the tenant's Autotask picklist ids, SLA targets, billing tiers, fiscal calendar and device classification rules, so another MSP can retarget the reports by editing one file.

## Purpose

Autotask picklist values (ticket source, priority, issue type, status, sub-issue) are numeric ids chosen per tenant, and SLA targets, the role-to-tier mapping and the fiscal year are contractual. Without this module each service would carry its own copy of those numbers. It isolates every such constant so that nothing else in `services/` needs editing to run against a different Autotask. It is data plus one hook: at the end of the module, `_apply_local_overrides()` replaces any constant with the value of the same name from an untracked `report_rules_local.py`, so a private deployment keeps its tenant values outside the public source and merges upstream without conflicts.

## Interface

| Group | Names | Meaning |
|---|---|---|
| Ticket sources | `TICKET_SOURCE_LABELS`, `TICKET_SOURCE_ORDER`, `TICKET_SOURCE_DEFAULT`, `TICKET_SOURCE_PHONE` | Source picklist id to report bucket (several ids fold into `Other`, `Phone` and `Monitoring Alert`); row order; fallback bucket; the id (2) used for first-call resolution. |
| Ticket priorities | `TICKET_PRIORITY_LABELS`, `TICKET_PRIORITY_ORDER`, `TICKET_PRIORITY_DEFAULT` | Priority id to `P1 Critical` through `P5 Scheduled` or `No Metrics`. |
| Issue types | `TICKET_ISSUE_TYPE_LABELS`, `TICKET_ISSUE_TYPE_DEFAULT`, `TICKET_ISSUE_TYPE_ORDER`, `PASSWORD_RESET_ISSUE_TYPE`, `PASSWORD_RESET_SUB_ISSUE_LABELS` | Issue type id to label. Password-reset tickets (issue type 33) are also bucketed by sub-issue, the system the reset was for; the order list puts those sub-buckets first, then `None` and `Password Reset`, then the issue types proper. |
| Ticket status | `TICKET_STATUS_COMPLETE` | Status id 5 means closed. |
| SLA | `SLA_TARGETS`, `SLA_NO_METRICS_PRIORITY`, `BUSINESS_HOURS` | Response and resolution targets in business hours per priority id (P1 1/9, P2 4/18, P3 9/45, P4 27/90); priority 6 is excluded from every metric; the business day is 08:00 to 17:00 Monday to Friday local time. |
| Disk-space tickets | `HDD_SUB_ISSUE_TYPE`, `HDD_MONITORING_SOURCE` | Sub-issue 503 ("Hard Drive") raised from source 8 (the RMM). |
| Utilization | `ROLE_TO_TIER`, `FISCAL_START_MONTH`, `INTERNAL_LABEL` | Time-entry role name to billing tier (Level 5 Specialist folds into Sr Sys Admin); the reporting year starts in September; hours with no company behind them are `Internal`. |
| Devices | `END_USER_DEVICE_TYPES`, `VM_MODELS`, `UDF_PENDING_RETIRED`, `UDF_PURCHASE_DATE`, `UDF_PRIMARY_USER`, `UDF_DEPARTMENT`, `EDITABLE_DEVICE_FIELDS` | Product types counted as end-user machines (`desktop`, `laptop`, `tablet`); model strings that mark a VM even when typed Desktop; user-defined field names on configuration items; the four grid columns that may be written back. |
| Overrides | `_apply_local_overrides()` | Called once at import. Imports `report_rules_local` if it exists and copies every uppercase name that already exists in this module into it. Lowercase names are ignored. An uppercase name with no counterpart here issues a `UserWarning` naming it. A missing local file is normal; any other `ModuleNotFoundError` (a broken import inside a real local file) propagates. |

## Uses

- `warnings` from the standard library, for the unknown-name warning.
- [server/report_rules_local.example.py](../../server/report_rules_local.example.py), the template for the untracked `report_rules_local.py` that the hook reads. See the [packaging inventory](<Reporting Server Packaging and Configuration Inventory.md>) for how that file ships.

## Used By

- [tickets service](<services/Reporting Service - tickets.md>) (all ticket groups and the status id)
- [sla service](<services/Reporting Service - sla.md>) (`SLA_TARGETS`, `SLA_NO_METRICS_PRIORITY`, `BUSINESS_HOURS`, `TICKET_PRIORITY_LABELS`)
- [hdd_tickets service](<services/Reporting Service - hdd_tickets.md>) (`HDD_SUB_ISSUE_TYPE`, `HDD_MONITORING_SOURCE`)
- [utilization service](<services/Reporting Service - utilization.md>) (`ROLE_TO_TIER`, `FISCAL_START_MONTH`, `INTERNAL_LABEL`)
- [devices service](<services/Reporting Service - devices.md>) (`END_USER_DEVICE_TYPES`, the UDF names, `EDITABLE_DEVICE_FIELDS`) and [services common](<services/Reporting Service - common.md>) (`VM_MODELS`, `UDF_PENDING_RETIRED`)
- [demo data](<demo/Reporting Demo - data.md>) (`ROLE_TO_TIER`, so the demo time entries carry real tier names)
- [server/tests/test_aggregates.py](../../server/tests/test_aggregates.py) (`TICKET_SOURCE_ORDER`, `TICKET_PRIORITY_ORDER`)
- [server/tests/test_report_rules_overrides.py](../../server/tests/test_report_rules_overrides.py) (the override hook, the warning, the derived tuple and error propagation)
- [server/tests/conftest.py](../../server/tests/conftest.py) registers an empty `report_rules_local` module before anything imports this one, so the suite tests the defaults even on a machine that has a real local file.

## Key Behavior

- Label maps are many-to-one on purpose: source ids -1 and 5 (client and web portal) both become `Other`, 15 (on call) becomes `Phone`, 19 (security platform alerts) becomes `Monitoring Alert`. The monthly report stays readable at the cost of detail.
- The `_ORDER` lists are the row order of the on-screen and exported tables. A label present in a `_LABELS` map but missing from the matching `_ORDER` list has no fixed row position, so the two must be edited together.
- `TICKET_ISSUE_TYPE_ORDER` contains `None` and `Password Reset`, which are not values in any label map; the tickets service uses them as bare keys for password-reset tickets with no recognised sub-issue.
- Utilization attributes hours to a tier by the role on the time entry, not the engineer's current department, so history does not change when someone moves role.
- `EDITABLE_DEVICE_FIELDS` includes `"Location"`, which is not a UDF name; the devices service owns how each editable column is written.
- Overrides run during this module's own import because every service does `from report_rules import NAME` at import time; a hook that ran later would leave those copies at the defaults.
- `EDITABLE_DEVICE_FIELDS` is built after the overrides have been applied, so it follows an overridden `UDF_*` name. It is the one constant that cannot itself be overridden; a local file that sets it is reported as an unknown name and ignored.
- Only names that already exist here are honoured. The uppercase filter means a local file can hold its own helpers in lowercase without them being reported, while a misspelt rule name produces a visible warning in the server log rather than a silently unused value.
- Every constant is referenced by at least one service, generator or test; nothing here is dead.

## Cleanup Notes

- No test asserts that every value in a `_LABELS` map appears in its `_ORDER` list, so a new label can silently fall off the table.

## Source

[server/report_rules.py](../../server/report_rules.py)
