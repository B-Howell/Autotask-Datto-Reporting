"""Schedules attach a day, an hour and recipients to a preset; runs record each attempt.

`next_run_at`, `last_run_at`, `started_at` and `finished_at` are ISO-8601 UTC
strings with an explicit offset, the format `sqlite.iso_now()` produces. The
`<=` in `due()` is therefore a plain string comparison, which is only correct
because every writer uses that one format: the schedules service is the only
code that computes `next_run_at`, and it must keep writing UTC with an offset.
"""

import json

from repositories import sqlite

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
    fields = _encode({k: v for k, v in changes.items() if k in COLUMNS})
    if not fields:
        return
    # The column names interpolated here come only from the COLUMNS allow-list
    # above, never from the caller; the values stay bound parameters.
    assignments = ", ".join(f"{k} = :{k}" for k in fields)
    sqlite.execute(
        f"UPDATE report_schedules SET {assignments}, updated_at = :now WHERE id = :id",
        {**fields, "now": sqlite.iso_now(), "id": schedule_id},
    )


def get(schedule_id):
    rows = sqlite.query("SELECT * FROM report_schedules WHERE id = ?", (schedule_id,))
    return _decode(rows[0]) if rows else None


def list_schedules():
    return [_decode(r) for r in sqlite.query("SELECT * FROM report_schedules ORDER BY id")]


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
        "INSERT INTO schedule_runs (schedule_id, trigger, started_at) VALUES (?, ?, ?)",
        (schedule_id, trigger, sqlite.iso_now()),
    )


def finish_run(run_id, status, error=None, saved_report_id=None):
    sqlite.execute(
        "UPDATE schedule_runs SET finished_at = ?, status = ?, error = ?, saved_report_id = ? "
        "WHERE id = ?",
        (sqlite.iso_now(), status, error, saved_report_id, run_id),
    )


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
