# Tenant router

> HTTP surface for the deployment's presentation settings and client logos: one read of the merged settings, one file download per logo.

## Purpose

The client will fetch `/api/tenant` once at startup (wired in the next change) to learn the agency groups, billing rates, year floors and logo map this deployment uses, in place of constants that used to live in client source. Logos are served from the same router so the image a report header shows comes from the untracked `data/logos` directory rather than from a bundled asset. The router is read-only: editing the settings means editing `data/tenant.json` by hand, which is the point of keeping them out of the source tree.

## Interface

| Method | Path | Query/body | Returns | Error mapping |
|---|---|---|---|---|
| GET | `/api/tenant` | none | JSON object with `groups`, `logos`, `ratedDepartments`, `firstReportYear`, `earliestQuarterYear` | none; a missing or malformed file yields the defaults |
| GET | `/api/tenant/logos/{filename}` | path `filename` | the PNG as a `FileResponse` | 400 when the service's `safe_filename` refuses the name (empty, `.`, `..`, containing a slash or backslash, or not its own base name); 404 when no such file exists under `data/logos` |

No route streams SSE and none uses `run_report`; both are quick file reads.

## Uses

- `fastapi.APIRouter`, `fastapi.HTTPException`, `fastapi.responses.FileResponse`, standard library `os`
- [tenant service](<../services/Reporting Service - tenant.md>) (`get_tenant`, `safe_filename`, `LOGO_DIR`)

## Used By

- [main](<../Reporting Server - main.md>) mounts `router`
- [server/tests/test_tenant.py](../../../server/tests/test_tenant.py) drives the logo route under `TestClient`

## Key Behavior

- The logo route only ever opens `os.path.join(LOGO_DIR, name)` for a name that `safe_filename` accepted. The guard checks for a forward slash and a backslash explicitly rather than trusting `os.path.basename`, so a name such as `..%5Ctenant.json` is a 400 on Linux, where a backslash is an ordinary filename character, exactly as it is on Windows. A name carrying an encoded forward slash (`..%2Ftenant.json`) never reaches the handler: the path is decoded before routing, the extra segment stops the `{filename}` pattern matching, and FastAPI answers its own 404.
- Any file placed in `data/logos` is served, with a media type derived from its extension; the route does not check that the file is an image.
- The settings response is whatever the service merged at request time; because the service re-reads the file on each call, an edit to `tenant.json` shows up on the next fetch with no restart.
- `FileResponse` sets the content type from the file extension, so a logo stored with a `.png` name is served as `image/png`. The no-cache middleware in [main](<../Reporting Server - main.md>) still applies, so the browser refetches the logo with each report.

## Cleanup Notes

- The response shape is not declared with a response model, so the OpenAPI schema shows an untyped object for the settings route.

## Source

[server/routers/tenant.py](../../../server/routers/tenant.py)
