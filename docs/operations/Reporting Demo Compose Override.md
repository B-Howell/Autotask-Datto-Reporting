# Demo Compose override

> The override file that runs the full stack on generated data with no vendor accounts.

## Purpose

Anyone evaluating the project should be able to see every report with one command. This override switches the server into demo mode and seeds the cache before uvicorn starts, so the first page load already has data. It is layered on the production file rather than duplicating it, which keeps the two deployments identical apart from the data source.

## Interface

```bash
docker compose -f docker-compose.yml -f docker-compose.demo.yml up --build
```

| Override | Effect |
|---|---|
| `environment.DEMO_MODE=1` | the settings loader stops requiring credentials and the vendor clients are replaced by the demo generators |
| `command` | `python -m demo.seed && uvicorn main:app --host 0.0.0.0 --port 8000` |

## Uses

- [Docker Compose stack](<Reporting Docker Compose Stack.md>) for everything not overridden.
- [config](<../server/Reporting Server - config.md>) for the `DEMO_MODE` flag.
- [demo seed](<../server/demo/Reporting Demo - seed.md>) and [demo data](<../server/demo/Reporting Demo - data.md>) for what gets written.

## Used By

- The README's demo-mode instructions and the screenshot tooling, see [screenshot capture](<Reporting Screenshot Capture.md>).

## Key Behavior

- The seed runs inside the server container on every start and performs a full sync against the demo generators, so each start takes about a minute before uvicorn begins serving. Running it again is safe: every snapshot scope is replaced whole, exactly as a real sync would leave it.
- The production `env_file` line still applies, so a `server/.env` must exist even in demo mode. An empty file, or one containing only `DEMO_MODE=1`, is enough.
- The background sync scheduler in [main](<../server/Reporting Server - main.md>) is not switched off in demo mode; on its interval it re-runs the generators, which only rewrites the same deterministic rows.

## Cleanup Notes

- None noted.

## Source

[docker-compose.demo.yml](../../docker-compose.demo.yml)
