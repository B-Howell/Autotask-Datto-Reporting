# Tenant service

> Deployment-specific presentation settings read from `tenant.json` under the data directory: agency groups, the logo map, billing rates and the year floors of the report pickers, with code defaults for anything the file leaves out.

## Purpose

Every value here used to be a constant in client source, which meant a private deployment had to edit tracked files to name its own agency groups or set its billing rates, and then carry those edits through every upstream merge. Keeping the values in an untracked JSON file under `settings.data_dir` moves that customisation out of the source tree entirely: the client fetches the merged settings once at startup through the [tenant router](<../routers/Reporting Router - tenant.md>) into its [tenant store](<../../client/store/Reporting Store - tenantStore.md>), and server-side work such as a scheduled report run resolves a dropdown value to its member agencies and finds a client's logo through the same module.

## Interface

| Name | Description |
|---|---|
| `TENANT_FILE` | `<data_dir>/tenant.json`. Tests monkeypatch this to a temporary path. |
| `LOGO_DIR` | `<data_dir>/logos`, the only directory logo filenames are resolved against. |
| `GROUP_PREFIX` | `"group:"`, the marker in front of a group name in a dropdown value. |
| `DEFAULTS` | The settings used when the file is absent or silent on a key: no groups, no logos, five rated departments (Administration 0, Call Center 65, Help Desk 75, Jr Sys Admin 80, Sr Sys Admin 90), `firstReportYear` 2024, `earliestQuarterYear` 2023. |
| `get_tenant()` | A fresh dict of `DEFAULTS` with every top-level key from the file laid over it. |
| `safe_filename(name)` | The name unchanged when it can only denote a file directly under a directory, else `None`. Refuses an empty name, `.`, `..`, any name containing `/` or `\`, and any name whose `os.path.basename` differs from it. |
| `group_members(group_name, agencies=None)` | The agencies whose `name` starts with the group's `matchPrefix`, or `[]` for an unknown group. Reads the agency list when none is passed. |
| `resolve_agency(agency_key)` | `(members, display name)` for a dropdown value: `group:<name>` gives the group's members and the group name; an integer company id gives a one-element list and the agency's name; anything else gives `([], "")`. |
| `logo_path(agency_name)` | Absolute path of the PNG mapped to that display name, or `None` when no mapping exists or the file is not on disk. |

The file shape, with every key optional, is the committed [server/data/tenant.example.json](../../../server/data/tenant.example.json): `groups` is a list of `{name, matchPrefix}`, `logos` maps an agency display name to a filename under `data/logos`, `ratedDepartments` is a list of `{department, rate}`, and the two year keys are integers.

## Uses

- Standard library `json`, `os`.
- [config](<../Reporting Server - config.md>) for `settings.data_dir`.
- [agencies service](<Reporting Service - agencies.md>) for `get_agencies`, imported by name so a test can replace it on this module.

## Used By

- [tenant router](<../routers/Reporting Router - tenant.md>) (`get_tenant`, `safe_filename`, `LOGO_DIR`)
- The client's [tenantStore](<../../client/store/Reporting Store - tenantStore.md>) carries a copy of `DEFAULTS` as `TENANT_DEFAULTS`; the two must stay identical.
- [server/tests/test_tenant.py](../../../server/tests/test_tenant.py)

## Key Behavior

- The merge is one level deep: a `ratedDepartments` list in the file replaces the default list whole rather than being merged entry by entry, so a deployment that wants a different rate for one department writes all five.
- A missing or malformed file is not an error. `get_tenant` swallows `OSError` and `JSONDecodeError` and answers with the defaults, so the demo stack and a fresh deployment work with no file at all; nothing in this module ever writes the file. A file that parses but is not a JSON object (a list, `null`, a bare number) is treated the same way, so a stray edit cannot crash the merge.
- `safe_filename` checks for both slash characters itself rather than relying on `os.path.basename`, which on Linux treats a backslash as an ordinary character. That keeps the logo route's refusal identical on Linux and Windows.
- The file is re-read on every call. The settings are small and change rarely, and reading each time means an edit takes effect without a restart. `group_members` and `logo_path` each call `get_tenant` themselves for the same reason.
- Group membership is a plain `str.startswith` on the agency name, case-sensitive, so a `matchPrefix` of `"Northfield "` (with the trailing space) matches `Northfield Schools` but not `Northfield` alone. The comment in `DEFAULTS` records the client-side rule that a group needs at least two members before it is shown; this module does not enforce it.
- `resolve_agency` accepts the id as a string or an int because dropdown values arrive as strings. A group name is taken verbatim after the prefix; an unknown group resolves to an empty member list with the name still returned.
- `logo_path` applies `os.path.basename` to the mapped filename before joining it to `LOGO_DIR`, so a mapping that names a path outside the logo directory cannot escape it.

## Cleanup Notes

- No shape validation: a `groups` entry without `matchPrefix` raises `KeyError` inside `group_members` rather than being reported at load time.
- `get_tenant` copies only the top level, so a caller that mutates a nested list mutates `DEFAULTS` for the rest of the process. No current caller does.

## Source

[server/services/tenant.py](../../../server/services/tenant.py)
