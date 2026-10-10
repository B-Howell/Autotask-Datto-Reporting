"""Background sync: refresh every report's cached snapshot from the live APIs.

Runs on a schedule and on demand from the settings page. Current-state reports
(devices, Office/Windows, patch, disk tickets) refresh per agency. Period
reports refresh only the period in progress: a past month never changes, so
it is cached once on first view and left alone.
"""

import threading
from dataclasses import dataclass
from datetime import datetime
from threading import Lock

from config import settings
from core import secrets, streams
from repositories import snapshots, sqlite
from services import (
    agencies,
    credentials,
    devices,
    hdd_tickets,
    office_windows,
    patch_management,
    sla,
    tickets,
    utilization,
)

STREAM = "sync"
_VENDORS = (credentials.AUTOTASK, credentials.DATTO)

# Why `SyncRunner.start()` refused, for the route to pass to the page.
ALREADY_RUNNING = "running"
CREDENTIALS_MISSING = "credentials"


@dataclass(frozen=True)
class StartOutcome:
    """Whether `SyncRunner.start()` started a sync and, when it did not, why."""

    started: bool
    reason: str | None = None


STARTED = StartOutcome(True)


def _require_vendors():
    """Raise, naming every unconfigured vendor, unless a live sync can call both.

    Demo mode calls neither vendor, so it never raises.
    """
    if not settings.demo_mode:
        credentials.require_all(_VENDORS)


def build_steps(now=None):
    """(label, callable) pairs for one full sync, in the order they run."""
    now = now or datetime.now()
    year, month = now.year, now.month
    quarter = (month - 1) // 3 + 1
    steps = []

    for a in agencies.get_agencies():
        cid, site, name = a["id"], a["site"], a["name"]
        steps.append(
            (f"{name}: patch", lambda s=site, log=None: patch_management.refresh_snapshot(s, log))
        )
        steps.append(
            (
                f"{name}: office/windows",
                lambda c=cid, s=site, log=None: office_windows.refresh_snapshot(c, s, log),
            )
        )
        steps.append(
            (
                f"{name}: devices",
                lambda c=cid, s=site, log=None: devices.refresh_snapshot(c, s, log),
            )
        )
        steps.append(
            (f"{name}: hdd tickets", lambda c=cid, log=None: hdd_tickets.refresh_snapshot(c, log))
        )

    steps.append(
        (f"SLA {year}-{month:02d}", lambda log=None: sla.refresh_snapshot(year, month, log))
    )

    q_start, q_end = utilization.quarter_range(year, quarter)
    fy_start, fy_end = utilization.fiscal_year_range(utilization.current_fiscal_year(now))
    for start, end in ((q_start, q_end), (fy_start, fy_end)):
        label = f"Utilization {utilization.period_label(start, end)}"
        steps.append(
            (
                label,
                lambda s=str(start), e=str(end), log=None: utilization.refresh_snapshot(s, e, log),
            )
        )

    for a in agencies.get_agencies():
        cid, name = a["id"], a["name"]
        steps.append(
            (
                f"{name}: tickets {year}-{month:02d}",
                lambda c=cid, log=None: tickets.refresh_snapshot(c, year, month, log),
            )
        )
    return steps


def run_sync(logger=print, progress=None):
    """Refresh every snapshot. A failing step is logged and skipped, never fatal.

    `progress(done, total, current_label)` is called before and after each step.
    """
    steps = build_steps()
    total = len(steps)
    logger(f"[INFO] Sync starting: {total} steps")
    if progress:
        progress(0, total, "starting")

    for done, (label, step) in enumerate(steps):
        logger(f"[INFO] ({done + 1}/{total}) {label}")
        if progress:
            progress(done, total, label)
        try:
            step(log=logger)
        except Exception as exc:
            logger(f"[WARN]   {label} failed: {exc}")
        if progress:
            progress(done + 1, total, label)

    logger(f"[DONE] Sync complete: {total} steps")


class SyncRunner:
    """Owns the one sync allowed in flight at a time and its visible status."""

    def __init__(self):
        self._lock = Lock()
        self._status = self._idle()

    @staticmethod
    def _idle():
        return {
            "running": False,
            "started_at": None,
            "finished_at": None,
            "error": None,
            "done": 0,
            "total": 0,
            "current": None,
        }

    def status(self):
        with self._lock:
            snapshot = dict(self._status)
        snapshot["last_synced_at"] = snapshots.last_sync_time()
        return snapshot

    def start(self):
        """Start a sync on a worker thread.

        Returns a `StartOutcome`: `STARTED`, or `started=False` with the reason
        `CREDENTIALS_MISSING` when a vendor has no usable credentials (the skip
        is written to the sync stream too, so the Settings page shows why
        nothing happened) or `ALREADY_RUNNING` when one is in flight.
        """
        try:
            _require_vendors()
        except (credentials.CredentialsMissing, secrets.SecretsError) as exc:
            streams.report_logger(STREAM, clear=False)(f"[WARN] Sync skipped: {exc}")
            return StartOutcome(False, CREDENTIALS_MISSING)
        with self._lock:
            if self._status["running"]:
                return StartOutcome(False, ALREADY_RUNNING)
            self._status = {**self._idle(), "running": True, "started_at": sqlite.iso_now()}
        streams.get_buffer(STREAM).clear()
        threading.Thread(target=self._run, daemon=True).start()
        return STARTED

    def _on_progress(self, done, total, current):
        with self._lock:
            self._status.update(done=done, total=total, current=current)

    def _run(self):
        logger = streams.report_logger(STREAM, clear=False)
        try:
            run_sync(logger=logger, progress=self._on_progress)
        except Exception as exc:
            with self._lock:
                self._status["error"] = str(exc)
            logger(f"[ERROR] Sync failed: {exc}")
        finally:
            with self._lock:
                self._status["running"] = False
                self._status["finished_at"] = sqlite.iso_now()


runner = SyncRunner()
