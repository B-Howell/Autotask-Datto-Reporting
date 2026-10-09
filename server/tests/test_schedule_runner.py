import threading

import pytest

from repositories import presets as preset_repo
from repositories import schedules as schedule_repo
from services import schedule_runner


@pytest.fixture
def live(monkeypatch):
    """Every schedule id the runner re-reads exists and is enabled; nothing touches a database."""
    monkeypatch.setattr(schedule_runner.schedules, "get", lambda sid: {"id": sid, "enabled": True})
    monkeypatch.setattr(schedule_runner.schedule_repo, "due", lambda now_iso: [])


def _lines(monkeypatch):
    lines = []
    monkeypatch.setattr(
        schedule_runner.streams, "report_logger", lambda name, clear=True: lines.append
    )
    return lines


def test_tick_runs_each_due_schedule_once_and_serialises(live, monkeypatch):
    ran = []
    monkeypatch.setattr(
        schedule_runner.schedule_repo, "due", lambda now_iso: [{"id": 1}, {"id": 2}]
    )
    monkeypatch.setattr(
        schedule_runner.scheduled_runs,
        "run_schedule",
        lambda sid, trigger, logger: ran.append((sid, trigger)),
    )
    runner = schedule_runner.ScheduleRunner()
    runner.tick()
    runner.join()
    assert ran == [(1, "schedule"), (2, "schedule")]


def test_run_now_refuses_while_a_run_is_in_flight(live, monkeypatch):
    gate = threading.Event()
    monkeypatch.setattr(
        schedule_runner.scheduled_runs,
        "run_schedule",
        lambda sid, trigger, logger: gate.wait(2),
    )
    runner = schedule_runner.ScheduleRunner()
    assert runner.run_now(5) is True
    assert runner.run_now(6) is False
    assert runner.status() == {"running": True, "schedule_id": 5}
    gate.set()
    runner.join()
    assert runner.status() == {"running": False, "schedule_id": None}


def test_tick_does_nothing_while_a_run_is_in_flight_and_catches_up_after(live, monkeypatch):
    started = threading.Event()
    gate = threading.Event()
    ran = []

    def run(sid, trigger, logger):
        ran.append((sid, trigger))
        started.set()
        gate.wait(2)

    monkeypatch.setattr(schedule_runner.scheduled_runs, "run_schedule", run)
    monkeypatch.setattr(schedule_runner.schedule_repo, "due", lambda now_iso: [{"id": 2}])
    runner = schedule_runner.ScheduleRunner()
    assert runner.run_now(1) is True
    assert started.wait(2)
    runner.tick()
    assert ran == [(1, "manual")]
    gate.set()
    runner.join()
    runner.tick()
    runner.join()
    assert ran == [(1, "manual"), (2, "schedule")]


def test_a_failing_schedule_is_logged_and_the_rest_still_run(temp_db, live, monkeypatch):
    ran = []
    lines = _lines(monkeypatch)

    def run(sid, trigger, logger):
        if sid == 1:
            raise RuntimeError("database is locked")
        ran.append(sid)

    monkeypatch.setattr(schedule_runner.scheduled_runs, "run_schedule", run)
    monkeypatch.setattr(
        schedule_runner.schedule_repo, "due", lambda now_iso: [{"id": 1}, {"id": 2}]
    )
    runner = schedule_runner.ScheduleRunner()
    runner.tick()
    runner.join()
    assert ran == [2]
    assert lines == ["[ERROR] Schedule 1: database is locked"]


def test_a_schedule_deleted_or_disabled_mid_batch_is_skipped(live, monkeypatch):
    ran = []
    lines = _lines(monkeypatch)
    rows = {2: {"id": 2, "enabled": False}, 3: {"id": 3, "enabled": True}}
    monkeypatch.setattr(schedule_runner.schedules, "get", lambda sid: rows.get(sid))
    monkeypatch.setattr(
        schedule_runner.schedule_repo,
        "due",
        lambda now_iso: [{"id": 1}, {"id": 2}, {"id": 3}],
    )
    monkeypatch.setattr(
        schedule_runner.scheduled_runs,
        "run_schedule",
        lambda sid, trigger, logger: ran.append((sid, trigger)),
    )
    runner = schedule_runner.ScheduleRunner()
    runner.tick()
    runner.join()
    assert ran == [(3, "schedule")]
    assert lines == [
        "[INFO] Schedule 1 no longer exists; skipped",
        "[INFO] Schedule 2 is disabled; skipped",
    ]

    # Run-now is how a schedule is tried before it is switched on, so a
    # disabled schedule still runs by hand; a deleted one does not.
    assert runner.run_now(2) is True
    runner.join()
    assert runner.run_now(1) is True
    runner.join()
    assert ran == [(3, "schedule"), (2, "manual")]
    assert lines[-1] == "[INFO] Schedule 1 no longer exists; skipped"


def test_sweep_interrupted_closes_running_rows_as_errors(temp_db):
    pid = preset_repo.insert(
        {"name": "p", "report_type": "sla", "agency_key": None, "agency_name": "", "options": {}}
    )
    sid = schedule_repo.insert(
        {
            "preset_id": pid,
            "day_of_month": 1,
            "hour": 7,
            "recipients_to": ["a@example.com"],
            "recipients_cc": [],
            "subject": "s",
            "body": "",
            "enabled": True,
            "next_run_at": None,
        }
    )
    finished = schedule_repo.insert_run(sid, trigger="manual")
    schedule_repo.finish_run(finished, status="ok", saved_report_id=3)
    stranded = schedule_repo.insert_run(sid, trigger="schedule")

    assert schedule_runner.sweep_interrupted() == 1

    rows = {r["id"]: r for r in schedule_repo.list_runs(sid)}
    assert rows[stranded]["status"] == "error"
    assert rows[stranded]["error"] == "Interrupted by a restart"
    assert rows[stranded]["finished_at"]
    assert rows[finished]["status"] == "ok" and rows[finished]["saved_report_id"] == 3
    assert schedule_runner.sweep_interrupted() == 0
