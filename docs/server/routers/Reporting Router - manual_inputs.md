# Manual inputs router

> Read and upsert hand-entered report values (licence counts and the like) keyed by agency and report type.

## Purpose

Some figures on a client report are not in either vendor API, for example how many Microsoft 365 licences the client owns. The Office and Windows page lets the user type them in, and this router stores them per agency and report so they are there next month. It is a thin pass-through to the repository; there is no service layer because there is no logic.

## Interface

| Method | Path | Query/body | Returns | Error mapping |
|---|---|---|---|---|
| GET | `/api/manual-inputs` | `agency_key: str` (required), `report_type: str` (required) | `{field_key: value}`; empty object when nothing is saved | 422 if a query parameter is missing |
| PUT | `/api/manual-inputs` | body `ManualInput {agency_key, report_type, field_key, value: str | null}` | `{ok: true}` | 422 on a malformed body |

No SSE, no `run_report`.

## Uses

- `fastapi.APIRouter`, `fastapi.Query`, `pydantic.BaseModel`
- [manual_inputs repository](<../repositories/Reporting Repository - manual_inputs.md>) (`get_manual_inputs`, `set_manual_input`)

## Used By

- [main](<../Reporting Server - main.md>) mounts `router`
- [client manualInputs API](<../../client/api/Reporting API - manualInputs.md>)

## Key Behavior

- PUT is an upsert on `(agency_key, report_type, field_key)`; the repository uses `ON CONFLICT ... DO UPDATE` and stamps `updated_at`.
- A `null` value is stored as the empty string (`body.value or ""`), so there is no way to delete a key through this API; clearing a field leaves an empty row behind, which the GET then returns as `""`.
- `agency_key` is a string on purpose: the client uses the agency id for a single agency and a group key for grouped agencies, and the repository stores `str(agency_key)` either way.
- One PUT per field; the client saves a field at a time rather than posting the whole form.
- Report type strings are free text agreed between client and server (`office_windows` is the one the demo seed fills).

## Cleanup Notes

- There is no DELETE route and no way to remove a stale field key other than editing the database.

## Source

[server/routers/manual_inputs.py](../../../server/routers/manual_inputs.py)
