# Manual inputs repository

> Row-level access to the `manual_inputs` table: hand-typed report values such as licence counts, keyed per agency, report and field.

## Purpose

Some report figures do not exist in either vendor system; the licensing report needs the number of Office and Windows licences the client actually owns, which an account manager types in. This module stores those values so they carry forward from month to month without leaking between agencies. It is a thin repository with no service above it; the router calls it directly.

## Interface

| Name | Description |
|---|---|
| `get_manual_inputs(agency_key, report_type)` | Returns `{field_key: value}` for one agency and report; an empty dict when nothing is saved. `agency_key` is coerced with `str()`. |
| `set_manual_input(agency_key, report_type, field_key, value)` | Upsert on the primary key `(agency_key, report_type, field_key)`, stamping `updated_at` with the current UTC time. |

## Uses

- [sqlite repository](<Reporting Repository - sqlite.md>) for `query`, `execute` and `iso_now`.

## Used By

- [manual_inputs router](<../routers/Reporting Router - manual_inputs.md>)
- [demo seed](<../demo/Reporting Demo - seed.md>), which fills in licence counts for the first demo agency.

## Key Behavior

- `agency_key` is TEXT on purpose. A single agency is stored under its Autotask company id as a string (for example `"1004"`); an agency group is stored under a group key of the form `group:<group name>`, so grouped reports keep their own figures.
- Values are stored as TEXT whatever the client sends; the client parses numbers back. The demo seed stores a JSON array as a string under a `::`-qualified field key, which shows the field namespace is the client's convention, not the repository's.
- There is no delete; clearing a value is done by writing an empty value.
- Values are not scoped by month. The table comment in the schema states this as the intent: a licence count entered once applies to every subsequent report until it is changed.

## Cleanup Notes

- No test covers this module directly; it is exercised only through the demo seed.

## Source

[server/repositories/manual_inputs.py](../../../server/repositories/manual_inputs.py)
