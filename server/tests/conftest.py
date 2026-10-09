"""Test fixtures.

DEMO_MODE is set before config is imported so the settings load without
vendor credentials. Tests that exercise the cache against a real SQLite file
point the repository at a temporary database and switch demo mode off, so the
fetch callback they pass is the one that runs.
"""

import dataclasses
import os

os.environ.setdefault("DEMO_MODE", "1")

import pytest  # noqa: E402

from config import settings  # noqa: E402
from repositories import snapshots, sqlite  # noqa: E402


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
