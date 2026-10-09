from datetime import date

import pytest

from integrations import delivery, renderer
from repositories import schedules as schedule_repo
from services import presets, saved_reports, scheduled_runs, schedules

AGENCY = "Harbor Point Health"
MEMBER = {"id": 1000, "site": "site-a", "name": AGENCY}


@pytest.fixture
def run_env(temp_db, tmp_path, monkeypatch):
    """Saved files go under tmp_path; the clock is 1 Nov 2026; nothing leaves the process."""
    monkeypatch.setattr(saved_reports, "SAVED_REPORTS_DIR", str(tmp_path / "saved"))
    monkeypatch.setattr(scheduled_runs, "_today", lambda: date(2026, 11, 1))
    monkeypatch.setattr(scheduled_runs.tenant, "resolve_agency", lambda key: ([MEMBER], AGENCY))
    monkeypatch.setattr(scheduled_runs.tenant, "logo_path", lambda name: None)
    rendered = {}
    monkeypatch.setattr(
        renderer,
        "render",
        lambda *a, **k: rendered.update(args=a, kwargs=k) or (b"PK", "application/x"),
    )
    sent = {}
    monkeypatch.setattr(delivery, "send", lambda **k: sent.update(k))
    return {"rendered": rendered, "sent": sent}


def _schedule(report_type="devices", agency_key="1000", options=None, **overrides):
    preset = presets.create(
        {
            "name": "p",
            "report_type": report_type,
            "agency_key": agency_key,
            "agency_name": AGENCY,
            "options": options or {},
        }
    )
    return schedules.create(
        {
            "preset_id": preset["id"],
            "day_of_month": 1,
            "hour": 7,
            "recipients_to": ["a@example.com"],
            "subject": "{agency} {report} {period}",
            **overrides,
        }
    )


def _device_sheet(monkeypatch, calls=None):
    def fake(cid, sid, logger=print, refresh=False):
        if calls is not None:
            calls.append((cid, sid))
        return {"sheet": [["Product"], ["Laptop"]], "ids": [1]}

    monkeypatch.setattr(scheduled_runs.devices, "get_device_sheet", fake)


def test_a_device_run_renders_saves_and_delivers(run_env, monkeypatch):
    schedule = _schedule(options={"columns": ["Product"]})
    _device_sheet(monkeypatch)

    run = scheduled_runs.run_schedule(schedule["id"], trigger="test", logger=lambda m: None)

    assert run["status"] == "ok" and run["saved_report_id"]
    args = run_env["rendered"]["args"]
    assert args[0] == "devices" and args[2] == {"columns": ["Product"]}
    assert args[1] == {
        "sheets": [{"sheet": [["Product"], ["Laptop"]], "ids": [1], "companyName": AGENCY}]
    }
    assert args[3] == f"{AGENCY} Computer Inventory 11-1-26.xlsx"
    sent = run_env["sent"]
    assert sent["subject"] == f"{AGENCY} Device inventory"
    assert sent["to"] == ["a@example.com"] and sent["cc"] == []
    assert sent["attachments"][0].name.endswith(".xlsx")
    assert sent["attachments"][0].content == b"PK"
    assert sent["attachments"][0].content_type == "application/x"
    assert schedule_repo.get(schedule["id"])["last_status"] == "ok"
    assert run["trigger"] == "test" and run["error"] is None
    saved = saved_reports.get_file(run["saved_report_id"])
    assert saved and saved[1] == f"{AGENCY} Computer Inventory 11-1-26.xlsx"


def test_a_failed_render_is_recorded_and_not_delivered(run_env, monkeypatch):
    schedule = _schedule(report_type="sla", agency_key=None)
    monkeypatch.setattr(
        scheduled_runs.sla, "get_sla_report", lambda y, m, logger=print: {"tickets": []}
    )
    monkeypatch.setattr(
        renderer, "render", lambda *a, **k: (_ for _ in ()).throw(renderer.RenderError("boom"))
    )
    called = []
    monkeypatch.setattr(delivery, "send", lambda **k: called.append(k))

    run = scheduled_runs.run_schedule(schedule["id"], trigger="test", logger=lambda m: None)

    assert run["status"] == "error" and "boom" in run["error"] and called == []
    assert run["saved_report_id"] is None
    row = schedule_repo.get(schedule["id"])
    assert row["last_status"] == "error" and "boom" in row["last_error"]


def test_a_failed_delivery_after_a_save_keeps_the_saved_report(run_env, monkeypatch):
    schedule = _schedule()
    _device_sheet(monkeypatch)
    monkeypatch.setattr(
        delivery,
        "send",
        lambda **k: (_ for _ in ()).throw(delivery.DeliveryError("flow returned 401")),
    )

    run = scheduled_runs.run_schedule(schedule["id"], trigger="test", logger=lambda m: None)

    assert run["status"] == "error" and "401" in run["error"]
    assert run["saved_report_id"] and saved_reports.get_file(run["saved_report_id"])


def test_the_period_placeholder_names_the_previous_month_for_sla(run_env, monkeypatch):
    schedule = _schedule(report_type="sla", agency_key=None, subject="{report} {period}")
    asked = []
    monkeypatch.setattr(
        scheduled_runs.sla,
        "get_sla_report",
        lambda y, m, logger=print: asked.append((y, m)) or {"tickets": []},
    )

    run = scheduled_runs.run_schedule(schedule["id"], trigger="test", logger=lambda m: None)

    assert run["status"] == "ok" and asked == [(2026, 10)]
    assert run_env["sent"]["subject"] == "SLA performance October 2026"
    assert run_env["rendered"]["args"][3] == "SLA Performance By Ticket October2026.xlsx"


def test_an_unknown_placeholder_is_left_literally(run_env, monkeypatch):
    schedule = _schedule(subject="{nope} for {agency} on {date}")
    _device_sheet(monkeypatch)

    scheduled_runs.run_schedule(schedule["id"], trigger="test", logger=lambda m: None)

    assert run_env["sent"]["subject"] == f"{{nope}} for {AGENCY} on 2026-11-01"


def test_an_agency_that_no_longer_resolves_fails_the_run(run_env, monkeypatch):
    schedule = _schedule(agency_key="4242")
    monkeypatch.setattr(scheduled_runs.tenant, "resolve_agency", lambda key: ([], ""))
    _device_sheet(monkeypatch)

    run = scheduled_runs.run_schedule(schedule["id"], trigger="test", logger=lambda m: None)

    assert run["status"] == "error" and "4242" in run["error"]
    assert run_env["sent"] == {} and run_env["rendered"] == {}


def test_a_scheduled_trigger_advances_and_a_manual_one_does_not(run_env, monkeypatch):
    schedule = _schedule()
    _device_sheet(monkeypatch)
    advanced = []
    monkeypatch.setattr(scheduled_runs.schedules, "advance", lambda s: advanced.append(s["id"]))

    scheduled_runs.run_schedule(schedule["id"], trigger="manual", logger=lambda m: None)
    assert advanced == []

    scheduled_runs.run_schedule(schedule["id"], trigger="schedule", logger=lambda m: None)
    assert advanced == [schedule["id"]]
    assert len(schedule_repo.list_runs(schedule["id"])) == 2


def test_the_body_is_escaped_html_with_newlines_as_breaks(run_env, monkeypatch):
    schedule = _schedule(body="Hello,\nAttached: Q3 & Q4 <draft>.\n\nThanks")
    _device_sheet(monkeypatch)

    scheduled_runs.run_schedule(schedule["id"], trigger="test", logger=lambda m: None)

    assert run_env["sent"]["body"] == (
        "Hello,<br>Attached: Q3 &amp; Q4 &lt;draft&gt;.<br><br>Thanks"
    )


def test_a_group_device_run_gathers_one_sheet_per_member(run_env, monkeypatch):
    members = [
        {"id": 1, "site": "s1", "name": "Harbor Point Health North"},
        {"id": 2, "site": "s2", "name": "Harbor Point Health South"},
    ]
    monkeypatch.setattr(scheduled_runs.tenant, "resolve_agency", lambda key: (members, AGENCY))
    schedule = _schedule(agency_key="group:" + AGENCY)
    calls = []
    _device_sheet(monkeypatch, calls)

    run = scheduled_runs.run_schedule(schedule["id"], trigger="test", logger=lambda m: None)

    assert run["status"] == "ok" and calls == [(1, "s1"), (2, "s2")]
    sheets = run_env["rendered"]["args"][1]["sheets"]
    assert [s["companyName"] for s in sheets] == [m["name"] for m in members]


def test_an_annual_run_passes_the_tenant_departments(run_env, monkeypatch):
    schedule = _schedule(
        report_type="annual_utilization",
        agency_key=None,
        options={"companies": ["A"], "rates": {"Help Desk": 70}},
        subject="{report} {period}",
    )
    asked = {}
    monkeypatch.setattr(
        scheduled_runs.utilization,
        "get_utilization",
        lambda start, end, logger=print: (
            asked.update(range=(start, end))
            or {"periodLabel": "FY 2026-27", "start": start, "end": end}
        ),
    )
    monkeypatch.setattr(
        scheduled_runs.utilization, "get_entries", lambda start, end, logger=print: [{"e": 1}]
    )
    departments = [{"department": "Help Desk", "rate": 75}]
    monkeypatch.setattr(
        scheduled_runs.tenant, "get_tenant", lambda: {"ratedDepartments": departments}
    )

    run = scheduled_runs.run_schedule(schedule["id"], trigger="test", logger=lambda m: None)

    assert run["status"] == "ok"
    assert asked["range"] == ("2026-09-01", "2027-08-31")
    args = run_env["rendered"]["args"]
    assert args[0] == "annual_utilization"
    assert args[1]["entries"] == [{"e": 1}] and args[1]["utilData"]["periodLabel"] == "FY 2026-27"
    assert args[2] == {"companies": ["A"], "rates": {"Help Desk": 70}, "departments": departments}
    assert args[3] == "Annual Utilization FY 2026-27.xlsx"
    assert run_env["sent"]["subject"] == "Annual utilization FY 2026-27"


def test_a_missing_schedule_raises(temp_db):
    with pytest.raises(LookupError):
        scheduled_runs.run_schedule(999, trigger="manual", logger=lambda m: None)
