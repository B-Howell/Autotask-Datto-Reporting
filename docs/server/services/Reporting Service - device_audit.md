# Device audit service

> Per-device enrichment from Datto's audit API: the installed Office product, RAM and C: drive size, resolved by hostname and fetched on a small thread pool.

## Purpose

Datto has no bulk audit endpoint, so finding what Office a machine runs or how much RAM it has is one or two calls per device. This module owns that work for the two reports that need it: it maps hostnames to Datto device uids, classifies installed software into Office product labels, rounds reported byte counts to marketing sizes, and runs the per-device calls concurrently with per-device progress. It is a helper service with no snapshot of its own.

## Interface

| Name | Description |
|---|---|
| `classify_office(software_name)` | Installed-software name to an Office label (`Microsoft 365 Business`, `Office LTSC Standard 2024 w/ Access`) or None. |
| `primary_office_label(labels)` | The one label a device is counted under when several are installed. |
| `round_ram_gb(gb)`, `round_storage_gb(gb)` | Round a usable size up to the smallest standard size within tolerance (0.1 GB for RAM, 0.5 GB for storage). |
| `resolve_device_uids(site_uid, hostnames, logger)` | `{device_uid: HOSTNAME}` for the hostnames found in the site, then across the whole account. |
| `office_labels_for(uid, hostname, logger)` | Office labels installed on one device; `[]` when the audit is unavailable. |
| `hardware_for(uid, hostname, logger)` | `(memory_gb, c_drive_gb)` from the hardware audit; `""` for anything unavailable. |
| `enrich_devices(site_uid, hostnames, logger, progress_phase)` | `{HOSTNAME: {office_version, memory_gb, storage_gb}}` for every hostname given. |
| `primary_office_by_device(site_uid, hostnames, logger, phases, phase_name)` | `{HOSTNAME: primary label}` for devices with Office installed. |

## Uses

- Standard library `concurrent.futures`, `re`.
- [datto integration](<../integrations/Reporting Integration - datto.md>) for device listings, audits and `max_workers`.

## Used By

- [devices service](<Reporting Service - devices.md>) (`enrich_devices`)
- [office_windows service](<Reporting Service - office_windows.md>) (`primary_office_by_device`)
- `server/tests/test_core.py` covers `classify_office`, `primary_office_label` and `round_storage_gb`.

## Key Behavior

- Hostname resolution searches the agency's own site first, then runs one account-wide listing for any hostnames still unmatched; agents are not always registered under the site that matches their Autotask company. Matching is on upper-cased, stripped hostnames.
- `classify_office`: anything mentioning Microsoft 365, M365, Office 365, or Click-to-Run with Office is a Microsoft 365 plan (Enterprise, Business or Basic by keyword, else the bare family name). Otherwise the name must contain "microsoft office", not match a skip marker (language packs, proofing tools, MUI, shared components and similar), and name a year from `KNOWN_OFFICE_YEARS`; the label is built as Office, optional LTSC, optional edition, year, and a `w/ Access` suffix when the name says so. Components that ship alongside Office are therefore counted zero times, not once each.
- `primary_office_label`: a specific Microsoft 365 plan wins over the bare family name, which wins over perpetual editions; among perpetual editions the newest year wins.
- `hardware_for` sums `physicalMemory[].size` in bytes and rounds to whole GiB; the C: drive is the `logicalDisks` entry whose identifier is `C` (colon stripped), converted at 1,000,000,000 bytes per GB then rounded up to a standard size.
- `STANDARD_STORAGE_GB` lists both decimal (500, 1000) and binary (512, 1024) sizes and rounding picks the first that fits, so the unit of conversion decides the label; `hardware_for` converts the C: drive in decimal GB so a 1 TB drive reads as 1000.
- Blank versus missing: an unavailable audit and a device with no Office both come back empty and both render as a blank column, so both are logged with `[WARN]` and the hostname, and `enrich_devices` logs how many devices had Office found.
- Concurrency: `enrich_devices` and `primary_office_by_device` use a `ThreadPoolExecutor` sized by the Datto client's `max_workers`; the client's pacing lock spaces the requests across those threads. Progress is reported per completed device through the caller's `Phases`.
- Hostnames with no Datto match still appear in the `enrich_devices` result with empty values, so the caller can treat the map as total.

## Cleanup Notes

- None noted.

## Source

[server/services/device_audit.py](../../../server/services/device_audit.py)
