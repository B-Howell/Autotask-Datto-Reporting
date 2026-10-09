# Common service helpers

> Small pure helpers shared by more than one report service: username normalisation, VM and pending-retired checks, Autotask date parsing and month bounds.

## Purpose

Several reports apply the same small rules to Autotask data: strip the domain from a last-logged-in user, decide whether a configuration item is really a virtual machine, read user-defined fields, and translate between Python datetimes and Autotask's timestamp format. Keeping them here means the rule lives once and the tenant-specific values behind it stay in `report_rules`.

## Interface

| Name | Description |
|---|---|
| `strip_domain(user)` | `DOMAIN\jsmith` becomes `jsmith`; a bare name passes through; None becomes `""`. |
| `is_virtual_machine(model)` | True when the model string, stripped, is in `VM_MODELS`. |
| `udf_values(item)` | `{name: value}` from a configuration item's `userDefinedFields` list; missing values become `""`. |
| `is_pending_retired(udf_fields)` | True when the `UDF_PENDING_RETIRED` field equals `pending`, case-insensitively. |
| `parse_autotask_datetime(value)` | ISO 8601 with a trailing `Z` to an aware datetime; None for empty or unparseable input. |
| `month_bounds(year, month)` | `(start, end)` naive datetimes for a calendar month, end exclusive. |
| `autotask_timestamp(dt)` | Formats a datetime as `YYYY-MM-DDTHH:MM:SSZ` for query filters. |

## Uses

- Standard library `datetime`.
- [report_rules](<../Reporting Server - report_rules.md>) for `UDF_PENDING_RETIRED` and `VM_MODELS`.

## Used By

- [devices service](<Reporting Service - devices.md>) (`is_pending_retired`, `is_virtual_machine`, `strip_domain`, `udf_values`)
- [office_windows service](<Reporting Service - office_windows.md>) (`is_pending_retired`, `is_virtual_machine`, `udf_values`)
- [hdd_tickets service](<Reporting Service - hdd_tickets.md>) (`is_virtual_machine`, `strip_domain`)
- [patch_management service](<Reporting Service - patch_management.md>) (`strip_domain`)
- [tickets service](<Reporting Service - tickets.md>) and [sla service](<Reporting Service - sla.md>) (`autotask_timestamp`, `month_bounds`, `parse_autotask_datetime`)

## Key Behavior

- `strip_domain` uses `rsplit` on the last backslash rather than `split`, because a name is occasionally reported with more than one separator and the account is always the final segment.
- `is_virtual_machine` is an exact match after `strip()`, not a substring test; new VM model strings must be added to `VM_MODELS`.
- `parse_autotask_datetime` swallows `ValueError` and `TypeError` so a malformed vendor timestamp yields None and the caller decides what a missing date means (the ticket service logs it, the SLA service scores it as "cannot be judged").
- `month_bounds` returns naive datetimes; callers format them with `autotask_timestamp`, which appends a literal `Z`, so month boundaries are expressed in UTC.

## Cleanup Notes

- None noted.

## Source

[server/services/common.py](../../../server/services/common.py)
