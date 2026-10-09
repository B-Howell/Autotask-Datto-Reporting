import threading

from repositories import presets as preset_repo
from repositories import schedules as schedule_repo
from services import schedule_runner


def test_tick_runs_each_due_schedule_once_and_serialises(monkeypatch):
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


def test_run_now_refuses_while_a_run_is_in_flight(monkeypatch):
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


def test_tick_does_nothing_while_a_run_is_in_flight_and_catches_up_after(monkeypatch):
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


def test_a_failing_schedule_is_logged_and_the_rest_still_run(monkeypatch):
    ran = []
    lines = []

    def run(sid, trigger, logger):
        if sid == 1:
            raise LookupError("No such schedule")
        ran.append(sid)

    monkeypatch.setattr(schedule_runner.scheduled_runs, "run_schedule", run)
    monkeypatch.setattr(
        schedule_runner.streams, "report_logger", lambda name, clear=True: lines.append
    )
    runner = schedule_runner.ScheduleRunner()
    runner.tick()
    assert ran == []
    monkeypatch.setattr(
        schedule_runner.schedule_repo, "due", lambda now_iso: [{"id": 1}, {"id": 2}]
    )
    runner.tick()
    runner.join()
    assert ran == [2]
    assert lines == ["[ERROR] Schedule 1: No such schedule"]


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
