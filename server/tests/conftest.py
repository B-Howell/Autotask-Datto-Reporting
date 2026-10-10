"""Test fixtures.

DEMO_MODE and SCHEDULE_TIMEZONE are set before config is imported so the
settings load without vendor credentials and in the zone the tests assume.
Tests that exercise the cache against a real SQLite file point the repository
at a temporary database and switch demo mode off, so the fetch callback they
pass is the one that runs.
"""

import dataclasses
import os
import sys
import types

os.environ.setdefault("DEMO_MODE", "1")
# The suite asserts UTC instants and calendar days, so the zone is pinned
# rather than defaulted: neither a developer's server/.env (loaded by config,
# which never overrides a variable already set) nor a value exported in the
# shell may change what those tests expect.
os.environ["SCHEDULE_TIMEZONE"] = "UTC"
# The suite must test the default rules even on a machine that has a real
# report_rules_local.py, so an empty module takes that name before anything
# imports report_rules.
sys.modules.setdefault("report_rules_local", types.ModuleType("report_rules_local"))

import pytest  # noqa: E402

from config import settings  # noqa: E402
from core import secrets  # noqa: E402
from repositories import snapshots, sqlite  # noqa: E402
from services import credentials  # noqa: E402

SAMPLE_AUTOTASK = {
    "autotask_username": "api-user",
    "autotask_secret": "hunter2-not-a-real-secret",
    "autotask_integration_code": "tracking-code-not-real",
    "autotask_base_url": "https://webservices.example.test/ATServicesRest",
}
SAMPLE_DATTO = {
    "datto_api_key": "datto-key-not-real",
    "datto_api_secret": "datto-secret-not-real",
    "datto_platform": "example",
}


@pytest.fixture
def temp_db(tmp_path, monkeypatch):
    """A fresh SQLite database for one test, with demo mode off for the cache."""
    monkeypatch.setattr(sqlite, "DATA_DIR", str(tmp_path))
    monkeypatch.setattr(sqlite, "DB_FILE", str(tmp_path / "reports.db"))
    monkeypatch.setattr(sqlite, "_conn", None)
    monkeypatch.setattr(snapshots, "settings", dataclasses.replace(settings, demo_mode=False))
    sqlite.init_db()
    yield sqlite
    conn = sqlite.get_conn()
    conn.close()
    monkeypatch.setattr(sqlite, "_conn", None)


@pytest.fixture
def store(temp_db, tmp_path, monkeypatch):
    """A fresh database and key, with every vendor variable cleared.

    config loads server/.env at import, so a developer's own credentials may
    be sitting in os.environ; clearing them keeps precedence deterministic.
    The listeners the vendor clients registered at import are kept, so a save
    reaches them; listeners a test adds are discarded with it.
    """
    monkeypatch.setattr(secrets, "KEY_FILE", str(tmp_path / "secret.key"))
    monkeypatch.setenv("APP_SECRET_KEY", "")
    secrets.reset_cache()
    for field in credentials.FIELDS.values():
        monkeypatch.delenv(field.env, raising=False)
    monkeypatch.setattr(credentials, "_listeners", list(credentials._listeners))
    credentials.invalidate()
    yield credentials
    credentials.invalidate()
    secrets.reset_cache()


def store_values(values):
    """Validate and store `values` as a tested save does, without the probes."""
    credentials.store_changes(credentials.changes(values))


@pytest.fixture
def configured(store):
    """Both vendors configured from the store; returns the values in effect."""
    values = {**SAMPLE_AUTOTASK, **SAMPLE_DATTO}
    store_values(values)
    return values
