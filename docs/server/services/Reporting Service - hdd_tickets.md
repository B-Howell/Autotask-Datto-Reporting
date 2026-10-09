# HDD tickets service

> Disk-space alert tickets counted per still-active physical device, with the C: drive capacity parsed from the alert title, cached per agency in `hdd_ticket_rows`.

## Purpose

The RMM raises an Autotask ticket whenever a workstation's C: drive crosses its "near full" threshold. Counting those tickets per device, and recording how big the drive is, gives account managers a list of chronic offenders to put forward for an upgrade. Everything comes from Autotask: the ticket's `configurationItemID` links to the device record, and the drive size is parsed from the title because the configuration item's storage field is a total across all disks.

## Interface

| Name | Description |
|---|---|
| `snapshot(company_id)` | `Snapshot("hdd", "hdd_ticket_rows", {company_id})`. |
| `c_drive_gb(title)` | Capacity in GB of the C: drive named in an alert title, or None. |
| `fetch_rows(company_id, logger)` | Rows `{device_name, ticket_count, last_user, c_drive_gb}` for one agency. |
| `get_hdd_report(company_ids=None, logger, refresh)` | Read-through across one or more agencies: `{devices, device_count, synced_at}`. |
| `refresh_snapshot(company_id, logger)` | Fetch and store one agency, ignoring the cache. |
| `HDD_PHASES` | Collecting tickets, Resolving devices, Building the report. |

## Uses

- Standard library `re`, `collections.Counter`.
- [progress core](<../core/Reporting Core - progress.md>), [autotask integration](<../integrations/Reporting Integration - autotask.md>)
- [report_rules](<../Reporting Server - report_rules.md>) (`HDD_MONITORING_SOURCE`, `HDD_SUB_ISSUE_TYPE`)
- [snapshots repository](<../repositories/Reporting Repository - snapshots.md>)
- [agencies service](<Reporting Service - agencies.md>) and [common helpers](<Reporting Service - common.md>)

## Used By

- [hdd_tickets router](<../routers/Reporting Router - hdd_tickets.md>)
- [sync service](<Reporting Service - sync.md>)
- [demo data](<../demo/Reporting Demo - data.md>) imports `HDD_PHASES`.

## Key Behavior

- Ticket query: `subIssueType = HDD_SUB_ISSUE_TYPE`, `source = HDD_MONITORING_SOURCE`, `companyID = company_id`, walked with the id cursor and reported as phase 1 progress.
- Per-device aggregation keeps a count and the capacity from the newest ticket whose title parsed; "newest" is decided by comparing `createDate` strings, which works because the ISO timestamps sort lexically. Tickets with no linked configuration item are counted and skipped with one log line.
- Title parsing: the regular expression matches `<letter>: Drive has ... out of <number> <G|T>B`; only drive letter C is accepted, thousands separators are removed, terabytes are multiplied by 1024, and the result is rounded to one decimal.
- Device resolution is one chunked `query_by_ids` for the referenced configuration items. A device is excluded when it is inactive (the point is upgrading machines still in use) or when its model label is a known VM; the exclusion counts are logged. A configuration item that no longer exists is skipped silently.
- Multi-agency reads: `get_hdd_report` with a falsy `company_ids` uses every agency from `agencies.json`. Each company is a separate snapshot; the combined `synced_at` is the oldest member's, and `cached` is true only when every member was a hit.
- Output ordering: worst offenders first (descending `ticket_count`), then by upper-cased device name. The rows are the stored shape; aggregation is only the sort and None-to-default normalisation.
- An agency with no alerts stores an empty snapshot, which the repository serves as a hit via `sync_state` rather than refetching.

## Cleanup Notes

- The `[INFO]` log lines use a Unicode ellipsis character in two messages while the rest of the codebase uses three dots.

## Source

[server/services/hdd_tickets.py](../../../server/services/hdd_tickets.py)
