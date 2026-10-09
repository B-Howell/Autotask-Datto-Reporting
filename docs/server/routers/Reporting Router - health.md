# Health router

> A liveness probe at `GET /health` that touches nothing external.

## Purpose

The container healthcheck and anyone checking that the server is up need an endpoint that answers quickly and does not depend on SQLite, Autotask or Datto. This route returns a constant. It is deliberately outside the `/api` prefix so it is reachable from inside the server container without going through nginx.

## Interface

| Method | Path | Query/body | Returns | Error mapping |
|---|---|---|---|---|
| GET | `/health` | none | `{"status": "ok"}` | none |

No SSE, no `run_report`.

## Uses

- `fastapi.APIRouter`

## Used By

- [main](<../Reporting Server - main.md>) mounts it first in `ROUTERS`
- The `healthcheck` in [docker-compose.yml](../../../docker-compose.yml) polls `http://localhost:8000/health` every 30 seconds with a 15 second start period
- [server/tests/test_routes.py](../../../server/tests/test_routes.py) (`test_responses_are_never_cacheable` uses it to check the no-cache headers)

## Key Behavior

- The route has no prefix, so nginx does not proxy it; it is only reachable on the server container's own port. From the host, `/api/...` routes are the way to check the stack end to end.
- A 200 from this route means the process is serving requests; it says nothing about whether the database opened or a sync is healthy. `GET /api/sync/state` is the route for that.
- Like every response, it carries the no-cache headers added by the middleware in `main.py`.

## Cleanup Notes

- None noted.

## Source

[server/routers/health.py](../../../server/routers/health.py)
