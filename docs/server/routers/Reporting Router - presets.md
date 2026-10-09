# Presets router

> Create, list, rename and delete the stored report configurations that schedules render.

## Purpose

A preset is one report, one agency and the options its export takes, kept so a schedule can render it unattended. This router is the scheduled reports page's way of managing them. It holds no rules of its own: the [presets service](<../services/Reporting Service - presets.md>) validates every field and refuses to delete a preset a schedule still uses; the router turns those refusals into status codes the page can show.

## Interface

| Method | Path | Query/body | Returns | Error mapping |
|---|---|---|---|---|
| GET | `/api/presets` | none | list of preset rows (`id, name, report_type, agency_key, agency_name, options, created_at, updated_at`), ordered by id | none |
| POST | `/api/presets` | JSON `PresetBody`: `name`, `report_type`, `agency_key` (string or int), `agency_name`, `options` (object); all optional in the schema, the service requires `name` and a known `report_type` | 201 with the stored row | 400 with the service's message (`Unknown report type: ...`, `This report needs an agency`, `A preset needs a name`, an options message) |
| PUT | `/api/presets/{preset_id}` | path `preset_id: int`; JSON `PresetBody` with only the fields to change | the stored row after the change | 404 `No such preset`; 400 when the merged row fails validation |
| DELETE | `/api/presets/{preset_id}` | path `preset_id: int` | `{deleted: true}` | 409 `Delete its schedules first` while a schedule references the preset; an unknown id still answers `deleted: true` |

`PresetBody` is one Pydantic model with every field optional, serialized with `exclude_unset=True`, so a PUT carrying only `name` reaches the service as `{"name": ...}` and the service merges it over the stored row. A field of the wrong JSON type (an `options` that is a list, say) is a 422 from FastAPI before the service sees it.

## Uses

- `fastapi` (`APIRouter`, `HTTPException`), `pydantic.BaseModel`
- [presets service](<../services/Reporting Service - presets.md>) (`list_presets`, `create`, `update`, `delete`)

## Used By

- [main](<../Reporting Server - main.md>) mounts `router`
- [server/tests/test_schedule_routes.py](../../../server/tests/test_schedule_routes.py)
- The scheduled reports page that the scheduled-delivery branch adds next.

## Key Behavior

- `_or_error` wraps each service call: `LookupError` is a 404 and `ValueError` a 400, both carrying the service's own message as `detail`, so the page shows `hour must be between 0 and 23` rather than a generic failure. The same helper appears in the [schedules router](<Reporting Router - schedules.md>); it is three lines and the two routers would otherwise share nothing.
- Delete maps `ValueError` to 409 rather than 400: the request is well formed, it conflicts with a schedule that exists. The page is expected to delete or re-point the schedule first.
- `agency_key` accepts a string or an integer because the client sends whatever the agency dropdown holds (a company id or a `group:<name>` key); the service stores it as text.
- Nothing here runs a report, so there is no job, no stream and no `run_report`.

## Cleanup Notes

- There is no `GET /api/presets/{id}`; the page lists everything and picks from the list, which is fine for the handful of presets one MSP keeps.

## Source

[server/routers/presets.py](../../../server/routers/presets.py)
