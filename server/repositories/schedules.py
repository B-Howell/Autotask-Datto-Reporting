"""Schedules attach a day, an hour and recipients to a preset; runs record each attempt.

`next_run_at`, `last_run_at`, `started_at` and `finished_at` are ISO-8601 UTC
strings with an explicit offset, the format `sqlite.iso_now()` produces. The
`<=` in `due()` is therefore a plain string comparison, which is only correct
because every writer uses that one format: the schedules service is the only
code that computes `next_run_at`, and it must keep writing UTC with an offset.
"""

import json

from repositories import sqlite

# What started a run, stored in `schedule_runs.trigger`.
TRIGGER_SCHEDULE = "schedule"
TRIGGER_MANUAL = "manual"
# A run's `status`, and a schedule's `last_status` once it has finished.
STATUS_RUNNING = "running"
STATUS_OK = "ok"
STATUS_ERROR = "error"

JSON_COLUMNS = ("recipients_to", "recipients_cc")
COLUMNS = (
    "preset_id",
    "day_of_month",
    "hour",
    "recipients_to",
    "recipients_cc",
    "subject",
    "body",
    "enabled",
    "next_run_at",
    "last_run_at",
    "last_status",
    "last_error",
)


def _decode(row):
    if row is None:
        return None
    row = dict(row)
    for column in JSON_COLUMNS:
        row[column] = json.loads(row[column] or "[]")
    row["enabled"] = bool(row["enabled"])
    return row


def _encode(fields):
    out = dict(fields)
    for column in JSON_COLUMNS:
        if column in out:
            out[column] = json.dumps(out[column] or [])
    if "enabled" in out:
        out["enabled"] = 1 if out["enabled"] else 0
    return out


def insert(schedule):
    now = sqlite.iso_now()
    data = _encode({k: schedule.get(k) for k in COLUMNS})
    return sqlite.execute(
        """
        INSERT INTO report_schedules (preset_id, day_of_month, hour, recipients_to, recipients_cc,
                                      subject, body, enabled, next_run_at, created_at, updated_at)
        VALUES (:preset_id, :day_of_month, :hour, :recipients_to, :recipients_cc, :subject, :body,
                :enabled, :next_run_at, :now, :now)
        """,
        {**data, "now": now},
    )


def update(schedule_id, changes):
    sqlite.update_row("report_schedules", schedule_id, _encode(changes), COLUMNS)


def get(schedule_id):
    rows = sqlite.query("SELECT * FROM report_schedules WHERE id = ?", (schedule_id,))
    return _decode(rows[0]) if rows else None


def list_schedules():
    return [_decode(r) for r in sqlite.query("SELECT * FROM report_schedules ORDER BY id")]


def list_for_preset(preset_id):
    return [
        _decode(r)
        for r in sqlite.query(
            "SELECT * FROM report_schedules WHERE preset_id = ? ORDER BY id", (preset_id,)
        )
    ]


def due(now_iso):
    """Enabled schedules whose next run is at or before `now_iso`, soonest first."""
    return [
        _decode(r)
        for r in sqlite.query(
            "SELECT * FROM report_schedules WHERE enabled = 1 AND next_run_at IS NOT NULL "
            "AND next_run_at <= ? ORDER BY next_run_at",
            (now_iso,),
        )
    ]


def delete(schedule_id):
    sqlite.execute("DELETE FROM schedule_runs WHERE schedule_id = ?", (schedule_id,))
    sqlite.execute("DELETE FROM report_schedules WHERE id = ?", (schedule_id,))


def insert_run(schedule_id, trigger):
    return sqlite.execute(
        "INSERT INTO schedule_runs (schedule_id, trigger, started_at, status) VALUES (?, ?, ?, ?)",
        (schedule_id, trigger, sqlite.iso_now(), STATUS_RUNNING),
    )


def finish_run(run_id, status, error=None, saved_report_id=None):
    sqlite.execute(
        "UPDATE schedule_runs SET finished_at = ?, status = ?, error = ?, saved_report_id = ? "
        "WHERE id = ?",
        (sqlite.iso_now(), status, error, saved_report_id, run_id),
    )


def list_running():
    """Runs still open, oldest first; after a restart these are the ones nobody will close."""
    return sqlite.query(
        "SELECT * FROM schedule_runs WHERE status = ? ORDER BY id", (STATUS_RUNNING,)
    )


def close_running(error):
    """Finish every open run as an error with the given message; returns how many were closed."""
    rows = list_running()
    for row in rows:
        finish_run(row["id"], STATUS_ERROR, error=error, saved_report_id=row["saved_report_id"])
    return len(rows)


def list_runs(schedule_id=None, limit=50):
    if schedule_id is None:
        return sqlite.query(
            "SELECT * FROM schedule_runs ORDER BY started_at DESC, id DESC LIMIT ?", (limit,)
        )
    return sqlite.query(
        "SELECT * FROM schedule_runs WHERE schedule_id = ? "
        "ORDER BY started_at DESC, id DESC LIMIT ?",
        (schedule_id, limit),
    )
