"""Server-side record of the report currently being generated.

Reports run for minutes in a worker thread and keep going whether or not the
browser that asked is still open. Keeping the current run here lets the status
bar be rebuilt after a reload, and lets several tabs agree on what is running.

Only the current run is kept: reports are generated one at a time in practice,
and a history would need pruning rules nobody has asked for.
"""

import json
import time
from threading import Lock

from core.progress import PROGRESS_PREFIX

_lock = Lock()
_job = None


class ReportCancelled(Exception):
    """Raised inside a report when the person who asked for it gave up.

    A worker thread cannot be killed from outside, but every report logs
    constantly, so the log call doubles as the place a cancellation is
    noticed and the work unwinds.
    """


def start(label):
    """Begin a job, replacing any previous one. Returns its id."""
    global _job
    job_id = f"{label}-{time.time()}"
    with _lock:
        _job = {
            "id": job_id,
            "label": label,
            "status": "running",
            "progress": None,
            "status_text": None,
            "error": None,
            "started_at": time.time(),
            "finished_at": None,
            "cancelled": False,
        }
    return job_id


def cancel(job_id=None):
    """Flag the running report to stop at its next progress report."""
    with _lock:
        if not _job or _job["status"] != "running":
            return False
        if job_id and _job["id"] != job_id:
            return False
        _job["cancelled"] = True
        return True


def raise_if_cancelled(job_id):
    with _lock:
        cancelled = bool(_job and _job["id"] == job_id and _job["cancelled"])
    if cancelled:
        raise ReportCancelled("Report cancelled")


def _absorb(job, message):
    if message.startswith(PROGRESS_PREFIX):
        try:
            job["progress"] = json.loads(message[len(PROGRESS_PREFIX) :])
        except ValueError:
            pass
    else:
        job["status_text"] = message


def note(job_id, message):
    """Record a log line against a job: progress lines update the bar, others the status text."""
    with _lock:
        if _job and _job["id"] == job_id:
            _absorb(_job, message)


def note_current(message):
    """Record a log line against whatever job is running, for endpoints that contribute to one."""
    with _lock:
        if _job and _job["status"] == "running":
            _absorb(_job, message)


def finish(job_id, error=None, cancelled=False):
    with _lock:
        if _job and _job["id"] == job_id:
            if cancelled or _job["cancelled"]:
                _job["status"] = "cancelled"
                _job["error"] = None
            else:
                _job["status"] = "error" if error else "done"
                _job["error"] = str(error) if error else None
            _job["finished_at"] = time.time()


def current():
    with _lock:
        return dict(_job) if _job else None


def clear():
    global _job
    with _lock:
        _job = None
