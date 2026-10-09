# Presets service

> Validates a report preset against the report types the renderer knows and stores it, so a schedule can only ever point at a configuration that will render.

## Purpose

A preset is one report as a user had it configured on screen: the report type, the agency or group it is for, and the options that report takes. A schedule renders its preset unattended, so a malformed preset would fail at the scheduled hour with nobody watching. This module is the gate: every create and update passes through `_validated`, which rejects unknown report types, demands an agency for agency-scoped reports and discards one for reports that are not, strips the options down to the keys the renderer reads for that type, and type-checks the ones that have a shape. Storage is delegated to the [presets repository](<../repositories/Reporting Repository - presets.md>).

## Interface

| Name | Description |
|---|---|
| `REPORT_TYPES` | Map of report type to `(needs_agency, allowed_option_keys, validator)`. The keys are `devices`, `office_windows`, `patch`, `hdd_tickets`, `sla`, `quarterly_utilization` and `annual_utilization`, and they must match the renderer's handler table in `client/renderer/render.ts` exactly. |
| `create(preset)` | Validates and inserts; returns the stored row (with `id`, timestamps and the filtered `options`). |
| `update(preset_id, changes)` | Loads the current row, lays `changes` over it, re-validates the whole thing and writes it back; returns the stored row. Raises `LookupError` when the id does not exist. |
| `get(preset_id)` | The stored row or None. |
| `list_presets()` | Every preset ordered by name. |
| `delete(preset_id)` | Removes the preset; a missing id is harmless. |

Validation failures raise `ValueError` with a message meant for the user: `Unknown report type: <type>`, `This report needs an agency`, `A preset needs a name`, `format must be docx or pdf`, `columns must be a list of column names`.

## Uses

- [presets repository](<../repositories/Reporting Repository - presets.md>), imported as `repo`.

## Used By

- [server/tests/test_presets.py](../../../server/tests/test_presets.py).
- The presets router and the schedules service that the scheduled-delivery branch adds next.

## Key Behavior

- Per report type: `devices` needs an agency and takes `columns`, which when present must be a list of strings (the renderer falls back to every column when it is absent). `office_windows` needs an agency and takes `format` (`docx` or `pdf`, defaulting to `docx` when absent) and `showLicenses`. `patch` and `hdd_tickets` need an agency and take no options. `sla` and `quarterly_utilization` take neither an agency nor options. `annual_utilization` takes no agency and passes `companies` and `rates` through unchecked.
- Unknown option keys are dropped silently rather than rejected, so a client that sends its whole screen state stores only what the renderer will read. Validators run on the filtered options.
- `agency_key` is coerced with `str()` for agency-scoped reports, so an integer company id and the string form store identically; for reports that are not agency-scoped it is forced to `None` even when the caller supplied one, which is why an SLA preset created with an agency comes back without it. `agency_name` is kept as given (or `""`) and is never validated against the agency list; it is a display label.
- `name` is stripped of surrounding whitespace and must be non-empty.
- `update` validates the merged row, not the delta: changing `report_type` on an existing preset re-applies that type's agency rule and option filter, so switching an SLA preset to `patch` without adding an agency is refused, and options that the new type does not take are dropped.
- Validation happens before any write, so a rejected create or update leaves the table untouched.

## Cleanup Notes

- `REPORT_TYPES` duplicates the renderer's handler list by hand; nothing checks the two at build time. The test asserts the expected set of keys, so a renderer change that adds a report type fails here only once someone updates the test.
- `showLicenses` is passed through without a type check; a non-boolean value is stored and left for the renderer to interpret.

## Source

[server/services/presets.py](../../../server/services/presets.py)
