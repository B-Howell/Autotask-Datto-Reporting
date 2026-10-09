"""Runtime configuration, read once from the environment (and server/.env)."""

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SERVER_DIR = os.path.dirname(os.path.abspath(__file__))


def _flag(name, default=False):
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


@dataclass(frozen=True)
class Settings:
    # Demo mode swaps the Autotask and Datto clients for deterministic
    # generators (see demo/), so the app runs end to end with no vendor
    # accounts. Credentials are optional in that mode and required otherwise.
    demo_mode: bool

    autotask_username: str
    autotask_secret: str
    autotask_integration_code: str
    # Autotask assigns each tenant to a zone; the zone's API hostname is shown
    # on the API user's page in Autotask.
    autotask_base_url: str

    datto_api_key: str
    datto_api_secret: str
    # Datto RMM is split across regional platforms. The platform is the first
    # label of the host you sign in to (https://<platform>.centrastage.net);
    # the REST API and its OAuth endpoint live at a sibling hostname.
    datto_api_base: str
    datto_token_url: str
    # How hard the Datto audit API is hit during a sync. A full sync audits
    # well over a thousand devices; too many in-flight requests on a small
    # container time out, and a timed-out audit is indistinguishable from
    # "no Office installed".
    datto_max_workers: int
    datto_min_request_interval: float
    datto_timeout: float

    cors_origins: tuple[str, ...]
    sync_interval_hours: float
    data_dir: str

    # Scheduled delivery. The renderer is the Node service that turns report
    # data into files (xlsx, docx, pdf) outside the browser. The delivery URL
    # is the HTTP trigger of the Power Automate flow that sends the mail; the
    # URL carries its own signature, so it is a secret and is never logged.
    # The timezone is the IANA zone a schedule's day of month and hour are
    # read in. The poll interval is how often due schedules are checked.
    renderer_url: str
    delivery_webhook_url: str
    schedule_timezone: str
    schedule_poll_seconds: int


def _required(name, demo_mode):
    value = os.environ.get(name, "")
    if not value and not demo_mode:
        raise RuntimeError(f"{name} is not set; copy server/.env.example to server/.env")
    return value


def load_settings():
    demo_mode = _flag("DEMO_MODE")
    platform = _required("DATTO_PLATFORM", demo_mode)
    datto_api_base = f"https://{platform}-api.centrastage.net"
    return Settings(
        demo_mode=demo_mode,
        autotask_username=_required("AUTOTASK_USERNAME", demo_mode),
        autotask_secret=_required("AUTOTASK_PASSWORD", demo_mode),
        autotask_integration_code=_required("AUTOTASK_TRACKING_ID", demo_mode),
        autotask_base_url=_required("AUTOTASK_BASE_URL", demo_mode).rstrip("/"),
        datto_api_key=_required("DATTO_API_KEY", demo_mode),
        datto_api_secret=_required("DATTO_API_SECRET", demo_mode),
        datto_api_base=datto_api_base,
        datto_token_url=f"{datto_api_base}/auth/oauth/token",
        datto_max_workers=int(os.environ.get("DATTO_MAX_WORKERS", "4")),
        datto_min_request_interval=float(os.environ.get("DATTO_MIN_REQUEST_INTERVAL", "0.05")),
        datto_timeout=float(os.environ.get("DATTO_TIMEOUT", "30")),
        cors_origins=tuple(
            o.strip()
            for o in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
            if o.strip()
        ),
        sync_interval_hours=float(os.environ.get("SYNC_INTERVAL_HOURS", "24")),
        data_dir=os.environ.get("DATA_DIR", os.path.join(SERVER_DIR, "data")),
        renderer_url=os.environ.get("RENDERER_URL", "http://localhost:3100").rstrip("/"),
        delivery_webhook_url=os.environ.get("DELIVERY_WEBHOOK_URL", ""),
        schedule_timezone=os.environ.get("SCHEDULE_TIMEZONE", "UTC"),
        schedule_poll_seconds=int(os.environ.get("SCHEDULE_POLL_SECONDS", "60")),
    )


settings = load_settings()
