from datetime import UTC, datetime
from zoneinfo import ZoneInfo

import pytest

from services import presets, schedules

NY = ZoneInfo("America/New_York")


def _sla_preset():
    return presets.create({"name": "p", "report_type": "sla", "agency_key": None, "options": {}})


def _schedule(preset_id, **overrides):
    return {
        "preset_id": preset_id,
        "day_of_month": 1,
        "hour": 7,
        "recipients_to": ["a@example.com"],
        "subject": "s",
        **overrides,
    }


def _freeze(monkeypatch, instant):
    monkeypatch.setattr(schedules, "_now", lambda: instant)


def test_next_run_is_the_coming_occurrence_in_the_schedule_timezone():
    now = datetime(2026, 10, 9, 15, 0, tzinfo=UTC)
    nxt = schedules.next_run_after(now, day_of_month=1, hour=7, tz=NY)
    # US daylight time ends at 02:00 on 1 Nov 2026, so 07:00 that morning is
    # EST (UTC-5) even though "now" in October is still EDT (UTC-4).
    assert nxt == "2026-11-01T12:00:00+00:00"


def test_next_run_today_later_is_today_and_earlier_is_next_month():
    at_6 = datetime(2026, 10, 1, 10, 0, tzinfo=UTC)  # 06:00 EDT
    assert schedules.next_run_after(at_6, 1, 7, NY) == "2026-10-01T11:00:00+00:00"
    at_8 = datetime(2026, 10, 1, 12, 0, tzinfo=UTC)  # 08:00 EDT
    assert schedules.next_run_after(at_8, 1, 7, NY) == "2026-11-01T12:00:00+00:00"


def test_next_run_exactly_at_the_scheduled_time_is_next_month():
    at_7 = datetime(2026, 10, 1, 11, 0, tzinfo=UTC)  # 07:00 EDT sharp
    assert schedules.next_run_after(at_7, 1, 7, NY) == "2026-11-01T12:00:00+00:00"


def test_day_31_clamps_to_the_last_day_of_short_months():
    now = datetime(2026, 11, 2, 0, 0, tzinfo=UTC)
    assert schedules.next_run_after(now, 31, 7, NY).startswith("2026-11-30T")
    leap = datetime(2028, 2, 1, 0, 0, tzinfo=UTC)
    assert schedules.next_run_after(leap, 31, 7, NY).startswith("2028-02-29T")


def test_next_run_in_utc_carries_the_plus_zero_offset_not_z():
    now = datetime(2026, 10, 9, 15, 0, tzinfo=UTC)
    nxt = schedules.next_run_after(now, 1, 7, ZoneInfo("UTC"))
    assert nxt == "2026-11-01T07:00:00+00:00"


def test_create_validates_recipients_and_computes_next_run(temp_db, monkeypatch):
    _freeze(monkeypatch, datetime(2026, 10, 9, 15, 0, tzinfo=UTC))
    preset = _sla_preset()
    with pytest.raises(ValueError, match="recipient"):
        schedules.create(_schedule(preset["id"], recipients_to=[]))
    with pytest.raises(ValueError, match="day"):
        schedules.create(_schedule(preset["id"], day_of_month=0))
    with pytest.raises(ValueError, match="hour"):
        schedules.create(_schedule(preset["id"], hour=24))
    with pytest.raises(ValueError, match="subject"):
        schedules.create(_schedule(preset["id"], subject="  "))
    with pytest.raises(ValueError, match="email"):
        schedules.create(_schedule(preset["id"], recipients_cc=["not-an-address"]))
    created = schedules.create(
        _schedule(preset["id"], recipients_to=[" A@Example.com ", ""], recipients_cc=None)
    )
    assert created["recipients_to"] == ["a@example.com"]
    assert created["recipients_cc"] == [] and created["body"] == ""
    assert created["next_run_at"] == "2026-11-01T07:00:00+00:00"  # settings default UTC
    assert created["enabled"] is True


def test_create_refuses_a_missing_preset(temp_db):
    with pytest.raises(ValueError, match="preset"):
        schedules.create(_schedule(999))


def test_non_integer_day_or_hour_is_a_clear_error(temp_db):
    preset = _sla_preset()
    with pytest.raises(ValueError, match="day_of_month"):
        schedules.create(_schedule(preset["id"], day_of_month="x"))
    with pytest.raises(ValueError, match="hour"):
        schedules.create(_schedule(preset["id"], hour=None))


def test_bad_schedule_timezone_setting_names_the_setting(temp_db, monkeypatch):
    import dataclasses

    from config import settings

    monkeypatch.setattr(
        schedules, "settings", dataclasses.replace(settings, schedule_timezone="Mars/Olympus")
    )
    preset = _sla_preset()
    with pytest.raises(ValueError, match="SCHEDULE_TIMEZONE"):
        schedules.create(_schedule(preset["id"]))


def test_update_moves_next_run_and_disabling_clears_it(temp_db, monkeypatch):
    _freeze(monkeypatch, datetime(2026, 10, 9, 15, 0, tzinfo=UTC))
    preset = _sla_preset()
    created = schedules.create(_schedule(preset["id"]))
    assert created["next_run_at"] == "2026-11-01T07:00:00+00:00"

    moved = schedules.update(created["id"], {"day_of_month": 15})
    assert moved["next_run_at"] == "2026-10-15T07:00:00+00:00"
    assert moved["recipients_to"] == ["a@example.com"] and moved["subject"] == "s"

    paused = schedules.update(created["id"], {"enabled": False})
    assert paused["enabled"] is False and paused["next_run_at"] is None

    resumed = schedules.update(created["id"], {"enabled": True})
    assert resumed["next_run_at"] == "2026-10-15T07:00:00+00:00"

    with pytest.raises(ValueError, match="recipient"):
        schedules.update(created["id"], {"recipients_to": []})
    with pytest.raises(LookupError):
        schedules.update(created["id"] + 1, {"hour": 8})


def test_advance_and_record_result(temp_db, monkeypatch):
    _freeze(monkeypatch, datetime(2026, 10, 9, 15, 0, tzinfo=UTC))
    preset = _sla_preset()
    created = schedules.create(_schedule(preset["id"]))

    _freeze(monkeypatch, datetime(2026, 11, 1, 7, 0, 30, tzinfo=UTC))
    schedules.advance(created)
    assert schedules.get(created["id"])["next_run_at"] == "2026-12-01T07:00:00+00:00"

    schedules.record_result(created["id"], "error", "renderer down")
    row = schedules.get(created["id"])
    assert row["last_status"] == "error" and row["last_error"] == "renderer down"
    assert row["last_run_at"] is not None

    schedules.record_result(created["id"], "ok")
    row = schedules.get(created["id"])
    assert row["last_status"] == "ok" and row["last_error"] is None


def test_list_schedules_carries_the_preset_and_delete_removes(temp_db):
    preset = _sla_preset()
    created = schedules.create(_schedule(preset["id"]))
    listed = schedules.list_schedules()
    assert [s["id"] for s in listed] == [created["id"]]
    assert listed[0]["preset"]["id"] == preset["id"]
    assert listed[0]["preset"]["report_type"] == "sla"

    schedules.delete(created["id"])
    assert schedules.get(created["id"]) is None and schedules.list_schedules() == []
