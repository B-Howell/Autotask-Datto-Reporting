"""Schedules: when a preset runs and who receives it.

A schedule is a day of month and an hour, read in the deployment's
`schedule_timezone`, plus the recipients of the rendered file. This module
validates those fields, computes `next_run_at` as the UTC instant the
scheduler loop compares against, and keeps that instant moving after each
run. It is the only code that writes `next_run_at`, and it must keep writing
UTC with a `+00:00` offset because the schedules repository compares the
column as text.
"""

import calendar
import re
from datetime import UTC, datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from config import settings
from repositories import presets as preset_repo
from repositories import schedules as repo
from repositories import sqlite

_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
# A schedule that names no hour runs at 07:00 in the schedule zone; the
# schema's column default says the same.
DEFAULT_HOUR = 7


def now_utc():
    """The clock every schedule computation reads; tests replace it to freeze time."""
    return datetime.now(UTC)


def tz():
    """The deployment's schedule zone, or a ValueError naming the bad setting."""
    try:
        return ZoneInfo(settings.schedule_timezone)
    except (ZoneInfoNotFoundError, ValueError) as exc:
        raise ValueError(
            f"SCHEDULE_TIMEZONE is not a known IANA zone: {settings.schedule_timezone!r}"
        ) from exc


def next_run_after(now, day_of_month, hour, zone):
    """ISO UTC time of the next occurrence of day/hour in `zone` strictly after now.

    A day past the end of a month runs on that month's last day, so "the 31st"
    means "month end" everywhere. The candidate is built as a wall-clock time
    in `zone` and converted afterwards, so a daylight-saving change between
    now and the candidate is reflected in the UTC result.
    """
    local = now.astimezone(zone)
    year, month = local.year, local.month
    for _ in range(2):
        last_day = calendar.monthrange(year, month)[1]
        candidate = local.replace(
            year=year,
            month=month,
            day=min(day_of_month, last_day),
            hour=hour,
            minute=0,
            second=0,
            microsecond=0,
        )
        if candidate > local:
            return candidate.astimezone(UTC).isoformat()
        year, month = (year + 1, 1) if month == 12 else (year, month + 1)
    raise RuntimeError("unreachable")


def _recipients(values):
    """The addresses in `values` stripped and lower-cased, blanks dropped.

    A bare string is one address, not a sequence of characters.
    """
    if isinstance(values, str):
        values = [values]
    cleaned = []
    for value in values or []:
        address = str(value).strip().lower()
        if not address:
            continue
        if not _EMAIL.match(address):
            raise ValueError(f"Not an email address: {address}")
        cleaned.append(address)
    return cleaned


def _whole_number(schedule, key, default):
    value = schedule.get(key, default)
    if isinstance(value, bool) or value is None:
        raise ValueError(f"{key} must be a whole number")
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{key} must be a whole number") from exc
    if not number.is_integer():
        raise ValueError(f"{key} must be a whole number")
    return int(number)


def _validated(schedule):
    if preset_repo.get(schedule.get("preset_id")) is None:
        raise ValueError("No such preset")
    day = _whole_number(schedule, "day_of_month", 0)
    hour = _whole_number(schedule, "hour", DEFAULT_HOUR)
    if not 1 <= day <= 31:
        raise ValueError("day_of_month must be between 1 and 31")
    if not 0 <= hour <= 23:
        raise ValueError("hour must be between 0 and 23")
    subject = (schedule.get("subject") or "").strip()
    if not subject:
        raise ValueError("A subject is required")
    recipients_to = _recipients(schedule.get("recipients_to"))
    if not recipients_to:
        raise ValueError("At least one recipient is required")
    return {
        "preset_id": schedule["preset_id"],
        "day_of_month": day,
        "hour": hour,
        "recipients_to": recipients_to,
        "recipients_cc": _recipients(schedule.get("recipients_cc")),
        "subject": subject,
        "body": schedule.get("body") or "",
        "enabled": bool(schedule.get("enabled", True)),
    }


def _with_next_run(fields):
    fields["next_run_at"] = (
        next_run_after(now_utc(), fields["day_of_month"], fields["hour"], tz())
        if fields["enabled"]
        else None
    )
    return fields


def create(schedule):
    return repo.get(repo.insert(_with_next_run(_validated(schedule))))


def update(schedule_id, changes):
    current = existing(schedule_id)
    repo.update(schedule_id, _with_next_run(_validated({**current, **changes})))
    return repo.get(schedule_id)


def get(schedule_id):
    return repo.get(schedule_id)


def existing(schedule_id):
    """The stored row, or a LookupError when there is no such schedule."""
    schedule = repo.get(schedule_id)
    if schedule is None:
        raise LookupError("No such schedule")
    return schedule


def list_schedules():
    """Schedules joined with their preset, for the management page."""
    by_id = {p["id"]: p for p in preset_repo.list_presets()}
    return [{**s, "preset": by_id.get(s["preset_id"])} for s in repo.list_schedules()]


def delete(schedule_id):
    existing(schedule_id)
    repo.delete(schedule_id)


def recent_runs(limit=50):
    """The newest runs across every schedule."""
    return repo.list_runs(limit=limit)


def runs_for(schedule_id):
    """One schedule's runs, newest first; a LookupError for an unknown schedule."""
    existing(schedule_id)
    return repo.list_runs(schedule_id)


def advance(schedule):
    """After a scheduled run: move next_run_at to the following occurrence."""
    repo.update(
        schedule["id"],
        {
            "next_run_at": next_run_after(
                now_utc(), schedule["day_of_month"], schedule["hour"], tz()
            )
        },
    )


def record_result(schedule_id, status, error=None):
    repo.update(
        schedule_id,
        {"last_run_at": sqlite.iso_now(), "last_status": status, "last_error": error},
    )
