# Runtime configuration

> Loads a frozen `Settings` dataclass once from the environment (and `server/.env`): demo mode, Datto pacing limits, CORS, the sync interval, paths and the scheduled-delivery settings. Vendor credentials are not settings; the credentials service resolves them at call time.

## Purpose

Everything tenant-specific that is not a business rule and does not change while the process runs comes from the environment: how hard the Datto audit API may be hit, CORS origins, the sync interval, the data directory, the scheduled-delivery settings (where the renderer listens, the mail flow's trigger URL, the schedule timezone and the poll interval), and the optional master key that encrypts credentials stored in the database. `config.py` reads them exactly once at import and exposes a single `settings` object. The one design decision is that the object is frozen and module-level: no code path can change configuration at runtime. The vendor credentials, the Autotask zone URL and the Datto platform are deliberately not here: they can be entered and rotated on the Settings page, so the [credentials service](<services/Reporting Service - credentials.md>) resolves them from the environment or the encrypted store at call time, and nothing is required at startup. A missing credential surfaces when a report or sync needs it, as a 503 naming the Settings page.

## Interface

| Setting | Environment variable | Default | Controls |
|---|---|---|---|
| `demo_mode` | `DEMO_MODE` | off | Swaps vendor fetches for the deterministic generators, so no vendor credentials are needed. Truthy values: `1`, `true`, `yes`, `on` (case-insensitive, trimmed). |
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
| `app_secret_key` | `APP_SECRET_KEY` | empty | Fernet master key for the vendor credentials stored in the database. Empty means [secrets](<core/Reporting Core - secrets.md>) generates `secret.key` in the data directory on first use. The field records what the deployment supplied; the secrets module reads the variable itself at key-load time. |

Functions: `_flag(name, default)` parses booleans, `load_settings()` builds the dataclass, `settings` is the singleton.

The seven vendor variables (`AUTOTASK_USERNAME`, `AUTOTASK_PASSWORD`, `AUTOTASK_TRACKING_ID`, `AUTOTASK_BASE_URL`, `DATTO_API_KEY`, `DATTO_API_SECRET`, `DATTO_PLATFORM`) are still honoured, but by the [credentials service](<services/Reporting Service - credentials.md>), which reads `os.environ` itself; a non-blank variable wins over the stored value and cannot be edited in the app.

## Uses

- `python-dotenv` (`load_dotenv` on `server/.env` next to this file), `os`, `dataclasses`

## Used By

- [main](<Reporting Server - main.md>) (`cors_origins`, `sync_interval_hours`)
- [sqlite repository](<repositories/Reporting Repository - sqlite.md>) and [snapshots repository](<repositories/Reporting Repository - snapshots.md>) (`data_dir`, `demo_mode`)
- [datto integration](<integrations/Reporting Integration - datto.md>) (the three pacing values)
- [sync service](<services/Reporting Service - sync.md>) (`demo_mode`, to skip the credential check)
- [agencies service](<services/Reporting Service - agencies.md>) and [saved_reports service](<services/Reporting Service - saved_reports.md>) (`data_dir`), [sla service](<services/Reporting Service - sla.md>) (`demo_mode`)
- [schedules service](<services/Reporting Service - schedules.md>) (`schedule_timezone`)
- [renderer integration](<integrations/Reporting Integration - renderer.md>) (`renderer_url`)
- [delivery integration](<integrations/Reporting Integration - delivery.md>) (`delivery_webhook_url`)
- [secrets](<core/Reporting Core - secrets.md>) (`data_dir` for the key file location; it reads `APP_SECRET_KEY` from the environment directly, not through `app_secret_key`)
- [server/tests/conftest.py](../../server/tests/conftest.py), which sets `DEMO_MODE=1` before the first import and overrides `demo_mode` per test with `dataclasses.replace`
- [server/tests/test_config.py](../../server/tests/test_config.py), which calls `load_settings()` directly to prove the scheduled-delivery defaults, the trailing-slash strip on `RENDERER_URL`, and that settings load outside demo mode with every vendor variable absent

## Key Behavior

- Settings load at import. Anything that imports `config` (directly or through a service) loads them; the test conftest exports `DEMO_MODE` before importing anything else so the suite runs against the generators.
- Nothing is required: every variable has a default, and the vendor credentials are resolved elsewhere, so a server with an empty environment starts and answers 503 on the vendor-backed routes until the Settings page or the environment supplies them.
- Numeric settings are parsed with `int()` and `float()` without range checks; a non-numeric value fails at import with a `ValueError`.
- `RENDERER_URL` has its trailing slash stripped, so callers can append `/render` without producing a double slash. `DELIVERY_WEBHOOK_URL` and `SCHEDULE_TIMEZONE` are stored as given: an empty webhook URL means delivery is not configured, and an unknown zone name is only detected when the [schedules service](<services/Reporting Service - schedules.md>) first resolves a time in it, which raises a `ValueError` naming `SCHEDULE_TIMEZONE` on the create, update or advance that triggered it rather than failing at startup.
- `.env` is loaded from the server directory regardless of the current working directory, so `python -m demo.seed` and uvicorn see the same file.

## Cleanup Notes

- `server/.env.example` documents the vendor variables, `DEMO_MODE`, `RENDERER_URL`, `DELIVERY_WEBHOOK_URL`, `SCHEDULE_TIMEZONE` and `APP_SECRET_KEY` but not `DATTO_MAX_WORKERS`, `DATTO_MIN_REQUEST_INTERVAL`, `DATTO_TIMEOUT`, `CORS_ORIGINS`, `SYNC_INTERVAL_HOURS` or `SCHEDULE_POLL_SECONDS`; those are discoverable only from this module. `DATA_DIR` is mentioned there in the closing note on deployment files.
- `load_settings()` is re-callable and the tests rely on that, but the module-level `settings` singleton is built once at import; a test that changes the environment sees the change only through its own `load_settings()` call.

## Source

[server/config.py](../../server/config.py)
