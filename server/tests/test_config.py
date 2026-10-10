from config import load_settings
from services import credentials

SCHEDULE_VARS = (
    "RENDERER_URL",
    "DELIVERY_WEBHOOK_URL",
    "SCHEDULE_TIMEZONE",
    "SCHEDULE_POLL_SECONDS",
)


def test_scheduled_delivery_settings_default_when_unset(monkeypatch):
    for name in SCHEDULE_VARS:
        monkeypatch.delenv(name, raising=False)

    loaded = load_settings()

    assert loaded.renderer_url == "http://localhost:3100"
    assert loaded.delivery_webhook_url == ""
    assert loaded.schedule_timezone == "UTC"
    assert loaded.schedule_poll_seconds == 60


def test_scheduled_delivery_settings_read_from_the_environment(monkeypatch):
    monkeypatch.setenv("RENDERER_URL", "http://r:1/")
    monkeypatch.setenv("DELIVERY_WEBHOOK_URL", "https://flow.example/trigger?sig=x")
    monkeypatch.setenv("SCHEDULE_TIMEZONE", "America/New_York")
    monkeypatch.setenv("SCHEDULE_POLL_SECONDS", "15")

    loaded = load_settings()

    assert loaded.renderer_url == "http://r:1"
    assert loaded.delivery_webhook_url == "https://flow.example/trigger?sig=x"
    assert loaded.schedule_timezone == "America/New_York"
    assert loaded.schedule_poll_seconds == 15


def test_vendor_credentials_are_not_required_at_startup(monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "0")
    for field in credentials.FIELDS.values():
        monkeypatch.delenv(field.env, raising=False)

    loaded = load_settings()

    assert loaded.demo_mode is False
    assert loaded.datto_max_workers == 4
