# Office and Windows service

> Windows 10 and 11 counts and one primary Office product per device for one agency, cached as count rows in `office_windows_counts`.

## Purpose

The licensing report needs to know how many machines run each client Windows version and each Office product, with the hostnames behind every count. The device list comes from Autotask (minus servers, VMs and pending-retired machines); the OS counted is the one Datto's agent reports live, falling back to Autotask's audit field; Office comes from each device's Datto software audit. The result is stored as one row per counted product so the report can be rebuilt without a vendor call.

## Interface

| Name | Description |
|---|---|
| `snapshot(company_id, site_uid)` | `Snapshot("office_windows", "office_windows_counts", {company_id, site_id})`. |
| `fetch_rows(company_id, site_uid, logger)` | Rows `{kind: "os" or "office", product, installs, devices_json}`. |
| `aggregate(rows)` | `{windows_installs: [...], office_installs: [...]}`, each item `{name, installs, devices}`. |
| `get_office_windows(company_id, site_uid, logger, refresh)` | Read-through; adds `synced_at`. |
| `refresh_snapshot(company_id, site_uid, logger)` | Fetch and store, ignoring the cache. |
| `OW_PHASES` | Collecting devices, Reading installed software, Building the report. |

## Uses

- Standard library `json`.
- [progress core](<../core/Reporting Core - progress.md>), [autotask integration](<../integrations/Reporting Integration - autotask.md>), [datto integration](<../integrations/Reporting Integration - datto.md>)
- [snapshots repository](<../repositories/Reporting Repository - snapshots.md>)
- [device_audit service](<Reporting Service - device_audit.md>) and [common helpers](<Reporting Service - common.md>)

## Used By

- [office_windows router](<../routers/Reporting Router - office_windows.md>)
- [sync service](<Reporting Service - sync.md>)
- [demo data](<../demo/Reporting Demo - data.md>) imports `OW_PHASES`.

## Key Behavior

- Device collection mirrors the device report: active configuration items for the company by id cursor, then two chunked passes (fields, then UDFs) because Autotask only returns `userDefinedFields` when `includeFields` is omitted. The UDFs are attached to each item as `udf_fields`.
- Server and VM filter: a device is dropped when its product name contains "server" (case-insensitive) or its model label is a known VM string. This is a blacklist on the product name, where the device report uses a whitelist of end-user types, so the two reports can disagree on tablets or unusual product names.
- Windows counting: the OS string is Datto's live `operatingSystem` for the hostname when present, else Autotask's `rmmDeviceAuditOperatingSystem`, lower-cased. Anything containing "windows server" is skipped; otherwise the first of `Windows 10`, `Windows 11` found in the string is counted. Pending-retired devices are skipped. Both versions always appear in the output, even at zero, in that order.
- Office counting: hostnames of non-pending devices go to `device_audit.primary_office_by_device`, which returns one label per device that has Office; devices with no Office or an unavailable audit are absent from every bucket. Buckets appear in the order they were first seen.
- Stored rows: `devices_json` is the JSON-encoded hostname list; `aggregate` decodes it and tolerates a bad or missing value by returning `[]`.
- `aggregate` is a pure function of the rows, so the report re-renders from the cache and is served in demo mode without any Autotask lookups.

## Cleanup Notes

- `count_office_versions` logs the "non-pending devices" count twice in consecutive lines with slightly different wording.
- Office buckets are not sorted, so the order of `office_installs` depends on audit completion order across threads and can change between refreshes.

## Source

[server/services/office_windows.py](../../../server/services/office_windows.py)
