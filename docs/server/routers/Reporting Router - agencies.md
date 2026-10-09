# Agencies router

> HTTP surface for the list of agencies the deployment reports on: list, add, remove.

## Purpose

An agency pairs an Autotask company id with the Datto RMM site that holds its agents and a display name. The settings page manages the list through these three routes. The router validates the body with a Pydantic model and trims whitespace; storage and de-duplication belong to the agencies service, which keeps the list as a JSON file under the data directory.

## Interface

| Method | Path | Query/body | Returns | Error mapping |
|---|---|---|---|---|
| GET | `/api/agencies` | none | JSON list of `{id, site, name}` sorted by name | none |
| POST | `/api/agencies` | body `AgencyIn {id: int, site: str, name: str}`; `site` and `name` must be at least one character | the full updated list | 422 on a malformed body |
| DELETE | `/api/agencies/{agency_id}` | path `agency_id: int` | the full updated list | 422 on a non-integer id |

No route streams SSE and none uses `run_report`; these calls are quick file reads and writes.

## Uses

- `fastapi.APIRouter`, `pydantic.BaseModel`, `pydantic.Field`
- [agencies service](<../services/Reporting Service - agencies.md>) (`get_agencies`, `add_agency`, `remove_agency`)

## Used By

- [main](<../Reporting Server - main.md>) mounts `router`
- [client agencies API](<../../client/api/Reporting API - agencies.md>)

## Key Behavior

- `site` and `name` are stripped before they reach the service; the model only guarantees they were non-empty before stripping, so a value of a single space passes validation and is stored as an empty string.
- Adding an agency whose id already exists is not an error: the service leaves the list unchanged and the route still answers 200 with the current list.
- Removing an id that does not exist is likewise a 200 with the unchanged list.
- Both write routes return the whole list rather than the changed entry, so the client replaces its store in one step.
- The service serialises access with a lock and rewrites the whole file on each change, so the list is small by design.

## Cleanup Notes

- The response shape is not declared with a response model, so the OpenAPI schema shows an untyped object for every route.

## Source

[server/routers/agencies.py](../../../server/routers/agencies.py)
