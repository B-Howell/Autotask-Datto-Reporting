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
    # accounts. The vendor credentials themselves are not settings: the
    # credentials service resolves them from the environment or the encrypted
    # store at call time, so they can be entered and rotated in the app.
    demo_mode: bool

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

    # Master key for the vendor credentials stored in the database: a Fernet
    # key, kept outside the database so a copied file is useless on its own.
    # When unset the server generates secret.key in the data directory on
    # first use. core/secrets.py reads the variable itself at key-load time;
    # this field records whether the deployment provided one.
    app_secret_key: str


def load_settings():
    return Settings(
        demo_mode=_flag("DEMO_MODE"),
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
        app_secret_key=os.environ.get("APP_SECRET_KEY", ""),
    )


settings = load_settings()
