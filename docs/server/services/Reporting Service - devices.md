# Devices service

> The device inventory for one agency: Autotask configuration items joined to Datto audit data by hostname, cached in `device_rows`, rendered as a sheet, and written back to Autotask when the grid is edited.

## Purpose

Autotask holds the asset record (product type, serial, location, user-defined fields); Datto holds what the agent last reported (last seen, installed Office, RAM, C: drive). This service merges the two into one row per end-user machine, stores the rows, and builds the header-plus-rows sheet the client renders and exports. It is also the one place the application writes to a vendor: edited grid cells go back to Autotask as user-defined field patches.

## Interface

| Name | Description |
|---|---|
| `snapshot(company_id, site_id)` | `Snapshot("devices", "device_rows", {company_id, site_id})`. |
| `fetch_rows(company_id, site_id, logger)` | The vendor pipeline; one dict per machine with the `STORED_FIELDS` keys. |
| `build_sheet(rows)` | `[header, *rows]` in `SHEET_COLUMNS` order. |
| `get_device_sheet(company_id, site_id, logger, refresh)` | Read-through: `{sheet, ids, synced_at, cached}`. |
| `refresh_snapshot(company_id, site_id, logger)` | Fetch and store, ignoring the cache; used by sync. |
| `update_devices(changes, logger)` | Write-back; returns one `{deviceId, status[, error]}` per device touched. |
| `DEVICE_PHASES`, `SHEET_COLUMNS`, `ROW_FIELDS`, `STORED_FIELDS`, `CARRY_FORWARD_FIELDS` | The phase names, the column map, and the field lists derived from it. |

## Uses

- [progress core](<../core/Reporting Core - progress.md>) (`Phases`)
- [autotask integration](<../integrations/Reporting Integration - autotask.md>) and [datto integration](<../integrations/Reporting Integration - datto.md>)
- [report_rules](<../Reporting Server - report_rules.md>) (`EDITABLE_DEVICE_FIELDS`, `END_USER_DEVICE_TYPES`, the UDF names)
- [snapshots repository](<../repositories/Reporting Repository - snapshots.md>) (`Snapshot`, `get_cached_rows`, `read_rows`)
- [device_audit service](<Reporting Service - device_audit.md>) and [common helpers](<Reporting Service - common.md>)

## Used By

- [devices router](<../routers/Reporting Router - devices.md>) (`get_device_sheet`, `update_devices`)
- [sync service](<Reporting Service - sync.md>) (`refresh_snapshot`)
- [demo data](<../demo/Reporting Demo - data.md>) imports `DEVICE_PHASES` to emit the same phases.
- `server/tests/test_devices_writeback.py`

## Key Behavior

- Sheet columns, in order: Product, Reference Name, Serial Number, IP Address Internal, Primary User or Role, Purchase Date, Department, Location, Last User, Last Seen, Manufacturer, Model, Processor, Memory GB, Storage GB, Operating System, Office Version, Antivirus Status, Patch Status. The row fields are `type, name, serial, ip, primary_user_or_role, purchase_date, department, location, last_user, last_seen, manufacturer, model, processor, memory_gb, storage_gb, operating_system, office_version, antivirus_status, patch_status`, which are also the `device_rows` columns, so cached rows round-trip unchanged. `autotask_id` is stored alongside but not shown; `get_device_sheet` returns it as `ids`, one per body row, None for rows cached before it was stored.
- Fetch phases: Collecting devices from Autotask (id cursor over active configuration items for the company), Loading device details (two chunked passes over the same ids: one with `ITEM_FIELDS`, one without `includeFields` because that is the only way Autotask returns `userDefinedFields`), Reading Datto audit data (per-device enrichment), Building the sheet.
- Row filter: a configuration item is dropped when its pending-retired UDF says `pending`, when its product name (minus an `RMM_` prefix) is not in `END_USER_DEVICE_TYPES`, or when its model label is a known VM string. Picklist ids for manufacturer, model, processor, antivirus and patch status are resolved through the cached `ConfigurationItems` picklists; product and location names through chunked id lookups; unknown ids render as `Unknown`.
- Datto overlay: last seen comes from the site's `account/devices` listing (`lastSeen` epoch milliseconds, formatted `MM/DD/YYYY hh:mm:ss AM`); Office, RAM and C: drive come from `device_audit.enrich_devices`. Datto RAM and storage replace Autotask's values only when present; otherwise the Autotask byte counts (rounded to one decimal GiB) stay and a `[WARN]` is logged per device. Office is always taken from Datto.
- Carry forward: before the fetch, the outgoing snapshot is read; after the fetch, any blank `office_version`, `memory_gb` or `storage_gb` whose previous row had a value is restored from the previous row by hostname, and the kept values are logged. Datto's audit is not always complete at sync time, and a whole-scope replace would otherwise overwrite a good value with a blank.
- Every stored row is normalised to exactly `STORED_FIELDS`, with None replaced by `""`.
- Write-back: `group_changes` drops entries with no `deviceId` or a field outside `EDITABLE_DEVICE_FIELDS` (logged, not sent), groups the rest per device, and `patch_device_udfs` sends one PATCH per device with a `userDefinedFields` payload. Failures are captured per device, so one bad device does not abort the batch.
- Purchase dates are reformatted from ISO to `MM/DD/YYYY`; unparseable values become `""`.

## Cleanup Notes

- `apply_datto` logs a `[WARN]` for every device without Datto RAM or disk data, including devices with no Datto agent at all, which makes the log noisy for a site with many unmatched hostnames.
- The two passes in `load_device_records` share one phase and both call `phases.update(done, total)`, so the bar for that phase fills twice.
- `format_last_seen` converts epoch milliseconds with `datetime.fromtimestamp`, so the displayed time is in the server's local zone.

## Source

[server/services/devices.py](../../../server/services/devices.py)
