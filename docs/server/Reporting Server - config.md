# Runtime configuration

> Loads a frozen `Settings` dataclass once from the environment (and `server/.env`), so credentials, vendor endpoints, pacing limits and paths are read in one place and nowhere else.

## Purpose

Everything tenant-specific that is not a business rule comes from the environment: Autotask and Datto credentials, the Autotask zone URL, the Datto platform, how hard the Datto audit API may be hit, CORS origins, the sync interval, the data directory, and the scheduled-delivery settings (where the renderer listens, the mail flow's trigger URL, the schedule timezone and the poll interval). `config.py` reads them exactly once at import, validates that the required ones are present outside demo mode, and exposes a single `settings` object. The one design decision is that the object is frozen and module-level: no code path can change configuration at runtime, and a missing credential fails at startup with a message naming the example file, not deep inside a report.

## Interface

| Setting | Environment variable | Default | Controls |
|---|---|---|---|
| `demo_mode` | `DEMO_MODE` | off | Swaps vendor fetches for the deterministic generators and makes every credential optional. Truthy values: `1`, `true`, `yes`, `on` (case-insensitive, trimmed). |
| `autotask_username` | `AUTOTASK_USERNAME` | required | API user name. |
| `autotask_secret` | `AUTOTASK_PASSWORD` | required | API user password. |
| `autotask_integration_code` | `AUTOTASK_TRACKING_ID` | required | Integration code header. |
| `autotask_base_url` | `AUTOTASK_BASE_URL` | required | Zone REST base URL; trailing slash stripped. |
| `datto_api_key`, `datto_api_secret` | `DATTO_API_KEY`, `DATTO_API_SECRET` | required | OAuth client credentials. |
| `datto_api_base` | derived from `DATTO_PLATFORM` | required | `https://<platform>-api.centrastage.net`. |
| `datto_token_url` | derived | | `<datto_api_base>/auth/oauth/token`. |
| `datto_max_workers` | `DATTO_MAX_WORKERS` | `4` | Audit thread pool size. |
| `datto_min_request_interval` | `DATTO_MIN_REQUEST_INTERVAL` | `0.05` | Seconds between Datto requests across all threads. |
| `datto_timeout` | `DATTO_TIMEOUT` | `30` | Per-request timeout in seconds. |
| `cors_origins` | `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated; blanks dropped. |
| `sync_interval_hours` | `SYNC_INTERVAL_HOURS` | `24` | Scheduler period. |
| `data_dir` | `DATA_DIR` | `server/data` | SQLite file, agency list, saved reports. |
| `renderer_url` | `RENDERER_URL` | `http://localhost:3100` | Base URL of the Node renderer that turns report data into files; trailing slash stripped. Docker compose points it at the renderer service. |
| `delivery_webhook_url` | `DELIVERY_WEBHOOK_URL` | empty | HTTP trigger URL of the Power Automate flow that sends scheduled mail. The URL carries its own signature, so it is a secret; empty means delivery is not configured. |
| `schedule_timezone` | `SCHEDULE_TIMEZONE` | `UTC` | IANA zone a schedule's day of month and hour are read in. |
| `schedule_poll_seconds` | `SCHEDULE_POLL_SECONDS` | `60` | How often the scheduler checks for due schedules. |

Functions: `_flag(name, default)` parses booleans, `_required(name, demo_mode)` returns the value or raises `RuntimeError` outside demo mode, `load_settings()` builds the dataclass, `settings` is the singleton.

## Uses

- `python-dotenv` (`load_dotenv` on `server/.env` next to this file), `os`, `dataclasses`

## Used By

- [main](<Reporting Server - main.md>) (`cors_origins`, `sync_interval_hours`)
- [sqlite repository](<repositories/Reporting Repository - sqlite.md>) and [snapshots repository](<repositories/Reporting Repository - snapshots.md>) (`data_dir`, `demo_mode`)
- [autotask integration](<integrations/Reporting Integration - autotask.md>) and [datto integration](<integrations/Reporting Integration - datto.md>) (credentials, URLs, pacing)
- [agencies service](<services/Reporting Service - agencies.md>) and [saved_reports service](<services/Reporting Service - saved_reports.md>) (`data_dir`), [sla service](<services/Reporting Service - sla.md>) (`demo_mode`)
- [schedules service](<services/Reporting Service - schedules.md>) (`schedule_timezone`)
- [renderer integration](<integrations/Reporting Integration - renderer.md>) (`renderer_url`)
- [server/tests/conftest.py](../../server/tests/conftest.py), which sets `DEMO_MODE=1` before the first import and overrides `demo_mode` per test with `dataclasses.replace`
- [server/tests/test_config.py](../../server/tests/test_config.py), which calls `load_settings()` directly to prove the scheduled-delivery defaults and the trailing-slash strip on `RENDERER_URL`

## Key Behavior

- Settings load at import. Anything that imports `config` (directly or through a service) triggers validation, which is why the test conftest exports `DEMO_MODE` before importing anything else.
- Outside demo mode a missing required variable raises `RuntimeError("<NAME> is not set; copy server/.env.example to server/.env")`. In demo mode the value is the empty string.
- `DATTO_PLATFORM` is validated before the dataclass is built; in demo mode with no platform the derived base URL is `https://-api.centrastage.net`, which is never contacted because the generators replace the client.
- Environment names and field names differ for two Autotask values: `AUTOTASK_PASSWORD` becomes `autotask_secret` and `AUTOTASK_TRACKING_ID` becomes `autotask_integration_code`.
- Numeric settings are parsed with `int()` and `float()` without range checks; a non-numeric value fails at import with a `ValueError`.
- `RENDERER_URL` has its trailing slash stripped like `AUTOTASK_BASE_URL`, so callers can append `/render` without producing a double slash. `DELIVERY_WEBHOOK_URL` and `SCHEDULE_TIMEZONE` are stored as given: an empty webhook URL means delivery is not configured, and an unknown zone name is only detected when the [schedules service](<services/Reporting Service - schedules.md>) first resolves a time in it, which raises a `ValueError` naming `SCHEDULE_TIMEZONE` on the create, update or advance that triggered it rather than failing at startup.
- `.env` is loaded from the server directory regardless of the current working directory, so `python -m demo.seed` and uvicorn see the same file.

## Cleanup Notes

- `server/.env.example` documents the credentials, `DEMO_MODE`, `RENDERER_URL`, `DELIVERY_WEBHOOK_URL` and `SCHEDULE_TIMEZONE` but not `DATTO_MAX_WORKERS`, `DATTO_MIN_REQUEST_INTERVAL`, `DATTO_TIMEOUT`, `CORS_ORIGINS`, `SYNC_INTERVAL_HOURS` or `SCHEDULE_POLL_SECONDS`; those are discoverable only from this module. `DATA_DIR` is mentioned there in the closing note on deployment files.
- `load_settings()` is re-callable and the tests rely on that, but the module-level `settings` singleton is built once at import; a test that changes the environment sees the change only through its own `load_settings()` call.
- `datto_token_url` is always derivable from `datto_api_base`; carrying both as settings is redundant.

## Source

[server/config.py](../../server/config.py)
