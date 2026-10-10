"""Owns the one scheduled run allowed in flight, and the once-a-minute check.

The loop in `main.py` calls `tick()` on the event loop; the page's run-now
button calls `run_now()` from a request. Both hand the work to one daemon
thread, so two reports never render at once and a manual run cannot overlap
a scheduled one. The runner never touches a schedule's columns itself; the
scheduled_runs service advances and stamps each schedule as part of the run.
"""

import threading

from core import streams
from repositories import schedules as schedule_repo
from repositories import sqlite
from services import scheduled_runs, schedules

STREAM = "schedules"
INTERRUPTED = "Interrupted by a restart"


class ScheduleRunner:
    """One worker thread at a time; `status()` says which schedule it is on."""

    def __init__(self):
        self._lock = threading.Lock()
        self._thread = None
        self._current = None

    def status(self):
        with self._lock:
            running = self._thread is not None and self._thread.is_alive()
            return {"running": running, "schedule_id": self._current if running else None}

    def _start(self, schedule_ids, trigger):
        with self._lock:
            if self._thread is not None and self._thread.is_alive():
                return False
            # Recorded before the thread exists so a status read right after
            # a run-now already names the schedule.
            self._current = schedule_ids[0]
            self._thread = threading.Thread(
                target=self._run_all, args=(list(schedule_ids), trigger), daemon=True
            )
            self._thread.start()
            return True

    def _run_all(self, schedule_ids, trigger):
        logger = streams.report_logger(STREAM, clear=True)
        for schedule_id in schedule_ids:
            with self._lock:
                self._current = schedule_id
            try:
                # Re-read before each one: a schedule later in the batch can
                # be deleted or switched off while the earlier ones run. A
                # manual run-now still runs a disabled schedule, since that
                # is how one is tried before it is switched on.
                schedule = schedules.get(schedule_id)
                if schedule is None:
                    logger(f"[INFO] Schedule {schedule_id} no longer exists; skipped")
                    continue
                if trigger == schedule_repo.TRIGGER_SCHEDULE and not schedule["enabled"]:
                    logger(f"[INFO] Schedule {schedule_id} is disabled; skipped")
                    continue
                scheduled_runs.run_schedule(schedule_id, trigger=trigger, logger=logger)
            except Exception as exc:  # a locked database, for instance
                logger(f"[ERROR] Schedule {schedule_id}: {exc}")
        with self._lock:
            self._current = None

    def tick(self):
        """Start every due schedule, in order, on one worker thread.

        One SQLite query and a thread start; `main` still calls it off the
        event loop, since a snapshot swap can hold the database lock for a
        while. While a run is in flight nothing starts; `due()` compares
        with `<=`, so whatever was due is picked up on the next tick after
        it finishes.
        """
        due = [s["id"] for s in schedule_repo.due(sqlite.iso_now())]
        if due:
            self._start(due, schedule_repo.TRIGGER_SCHEDULE)

    def run_now(self, schedule_id):
        """Start one schedule from the page. False when a run is already in flight."""
        return self._start([schedule_id], schedule_repo.TRIGGER_MANUAL)

    def join(self, timeout=5):
        thread = self._thread
        if thread is not None:
            thread.join(timeout)


def sweep_interrupted():
    """Close run rows a previous process left in `running`; the schedules were already advanced.

    Returns how many rows were closed.
    """
    return schedule_repo.close_running(INTERRUPTED)


runner = ScheduleRunner()
