import dataclasses
import time

import pytest
from conftest import SAMPLE_DATTO

from core import streams
from services import sync


@pytest.fixture
def recorded_runs(monkeypatch):
    runs = []
    monkeypatch.setattr(sync, "run_sync", lambda logger, progress: runs.append("ran"))
    return runs


def _live_mode(monkeypatch):
    monkeypatch.setattr(sync, "settings", dataclasses.replace(sync.settings, demo_mode=False))


def _wait_until_idle(runner):
    for _ in range(200):
        if not runner.status()["running"]:
            return
        time.sleep(0.01)
    raise AssertionError("the sync thread did not finish")


def _last_sync_line():
    lines, _ = streams.get_buffer(sync.STREAM).since(0)
    return lines[-1]


def test_a_sync_is_skipped_naming_every_unconfigured_vendor(store, recorded_runs, monkeypatch):
    _live_mode(monkeypatch)
    runner = sync.SyncRunner()

    assert runner.start() is False

    assert recorded_runs == []
    assert runner.status()["running"] is False
    assert _last_sync_line() == (
        "[WARN] Sync skipped: Autotask and Datto credentials are not configured; open Settings"
    )


def test_a_sync_is_skipped_when_one_vendor_is_unconfigured(store, recorded_runs, monkeypatch):
    _live_mode(monkeypatch)
    store.save(SAMPLE_DATTO)

    assert sync.SyncRunner().start() is False

    assert recorded_runs == []
    assert _last_sync_line() == (
        "[WARN] Sync skipped: Autotask credentials are not configured; open Settings"
    )


def test_a_sync_runs_when_both_vendors_are_configured(configured, recorded_runs, monkeypatch):
    _live_mode(monkeypatch)
    runner = sync.SyncRunner()

    assert runner.start() is True
    _wait_until_idle(runner)

    assert recorded_runs == ["ran"]


def test_demo_mode_syncs_without_credentials(store, recorded_runs):
    runner = sync.SyncRunner()

    assert runner.start() is True
    _wait_until_idle(runner)

    assert recorded_runs == ["ran"]
