"""One scheduled run: gather the data, render the file, keep a copy, deliver it.

The services do the fetching exactly as they do for the browser; the renderer
produces the same bytes the browser's export button would; the saved copy
lands in Saved Reports under the filename the browser would have used, so a
delivered file can always be reopened and a manual save of the same report on
the same day replaces it rather than sitting beside it.
"""

import base64
import calendar
import html
import os
import re

from integrations import delivery, renderer

# Re-exported so the routers can map these without importing the integrations.
from integrations.delivery import DeliveryError as DeliveryError
from integrations.renderer import RenderError as RenderError
from repositories import manual_inputs
from repositories import schedules as schedule_repo
from services import (
    devices,
    hdd_tickets,
    office_windows,
    patch_management,
    periods,
    presets,
    saved_reports,
    schedules,
    sla,
    tenant,
    utilization,
)

# Subject and body placeholder `{report}` per report type.
REPORT_LABELS = {
    "devices": "Device inventory",
    "office_windows": "Office and Windows licensing",
    "patch": "Patch management",
    "hdd_tickets": "Disk-space tickets",
    "sla": "SLA performance",
    "quarterly_utilization": "Quarterly utilization",
    "annual_utilization": "Annual utilization",
}
# The Saved Reports page files the quarterly report under the browser's
# older `utilization` type; the scheduled copy must land in the same bucket.
SAVED_REPORT_TYPES = {"quarterly_utilization": "utilization"}
# A placeholder is a bare word in braces; `{agency:>6}` or `{}` is not one.
_PLACEHOLDER = re.compile(r"\{(\w+)\}")
# The page's delivery check: one line through the flow, nothing attached.
TEST_SUBJECT = "Reporting: delivery test"
TEST_BODY = "This is a test message from the reporting server. Delivery is working."
NO_PERIOD = ""


def _today():
    """The calendar day in the deployment's schedule zone.

    The period a run reports on and the date in its filename follow the
    day the schedule was set for, not the container's clock: a run at
    02:30 UTC on 1 Nov is still 31 Oct in New York, and must send
    September's SLA report, not October's.
    """
    return schedules.now_utc().astimezone(schedules.tz()).date()


def _stamp():
    """M-D-YY without zero padding, the browser's `fileDateStamp`."""
    t = _today()
    return f"{t.month}-{t.day}-{t.year % 100:02d}"


def _agency_filename(agency_name, title, extension):
    """`<agency> <title> <M-D-YY>.<ext>`, the name the browser's export pages use."""
    return f"{agency_name} {title} {_stamp()}.{extension}"


def _logo_base64(agency_name):
    path = tenant.logo_path(agency_name) if agency_name else None
    if not path:
        return None
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("ascii")


def _members(preset):
    """The agencies a preset's key stands for, or a clear error when it no longer resolves."""
    members, _name = tenant.resolve_agency(preset["agency_key"])
    if not members:
        raise LookupError(
            f"Agency {preset['agency_key']!r} ({preset['agency_name'] or 'unnamed'}) "
            "is no longer in the agency list; edit the preset"
        )
    return members


def _first_member(preset, label, logger):
    """The one member a single-site report covers, warning when a group has more."""
    members = _members(preset)
    if len(members) > 1:
        logger(
            f"[WARN] {preset['agency_name']} has {len(members)} members; the {label} "
            f"report covers only {members[0]['name']}"
        )
    return members[0]


# Each gatherer assembles the payload the browser hands the matching export
# builder and names the file the way that page does, so the saved copy dedupes
# against a manual export of the same day. All return (data, filename, period).


def _gather_devices(preset, logger):
    sheets = []
    for member in _members(preset):
        logger(f"[INFO] Gathering devices for {member['name']}")
        sheet = devices.get_device_sheet(member["id"], member["site"], logger=logger)
        sheets.append({"sheet": sheet["sheet"], "ids": sheet["ids"], "companyName": member["name"]})
    filename = _agency_filename(preset["agency_name"], "Computer Inventory", "xlsx")
    return {"sheets": sheets}, filename, NO_PERIOD


def _gather_office_windows(preset, logger):
    member = _first_member(preset, "Office and Windows", logger)
    logger(f"[INFO] Gathering Office and Windows installs for {member['name']}")
    data = {
        "breakdown": office_windows.get_office_windows(member["id"], member["site"], logger=logger),
        "manualInputs": manual_inputs.get_manual_inputs(
            preset["agency_key"], preset["report_type"]
        ),
        "agencyName": preset["agency_name"],
    }
    extension = preset["options"].get("format", "docx")
    filename = _agency_filename(preset["agency_name"], "Office and Windows Installs", extension)
    return data, filename, NO_PERIOD


def _gather_patch(preset, logger):
    member = _first_member(preset, "patch", logger)
    logger(f"[INFO] Gathering patch status for {member['name']}")
    data = {
        "report": patch_management.get_patch_report(member["site"], logger=logger),
        "agency": {"id": member["id"], "site": member["site"], "name": preset["agency_name"]},
    }
    filename = _agency_filename(preset["agency_name"], "Patch Management Summary", "pdf")
    return data, filename, NO_PERIOD


def _gather_hdd_tickets(preset, logger):
    ids = [member["id"] for member in _members(preset)]
    logger(f"[INFO] Gathering disk-space tickets for {preset['agency_name']}")
    report = hdd_tickets.get_hdd_report(ids, logger=logger)
    filename = _agency_filename(preset["agency_name"], "HDD Storage Tickets", "xlsx")
    return {"devices": report["devices"]}, filename, NO_PERIOD


def _gather_sla(preset, logger):
    year, month = periods.previous_month(_today())
    month_name = calendar.month_name[month]
    period = f"{month_name} {year}"
    logger(f"[INFO] Gathering SLA performance for {period}")
    report = sla.get_sla_report(year, month, logger=logger)
    return report, f"SLA Performance By Ticket {month_name}{year}.xlsx", period


def _gather_quarterly_utilization(preset, logger):
    start, end = periods.previous_quarter(_today())
    period = utilization.period_label(start, end)
    logger(f"[INFO] Gathering utilization for {period}")
    report = utilization.get_utilization(start, end, logger=logger)
    return report, f"Agency Utilization {period}.xlsx", period


def _gather_annual_utilization(preset, logger):
    start, end = periods.fiscal_year_of_previous_month(_today())
    period = utilization.period_label(start, end)
    logger(f"[INFO] Gathering annual utilization for {period}")
    report = utilization.get_utilization(start, end, logger=logger)
    entries = utilization.get_entries(start, end, logger=logger)
    return {"utilData": report, "entries": entries}, f"Annual Utilization {period}.xlsx", period


# Keyed exactly like presets.REPORT_TYPES; the test suite checks the two agree.
GATHERERS = {
    "devices": _gather_devices,
    "office_windows": _gather_office_windows,
    "patch": _gather_patch,
    "hdd_tickets": _gather_hdd_tickets,
    "sla": _gather_sla,
    "quarterly_utilization": _gather_quarterly_utilization,
    "annual_utilization": _gather_annual_utilization,
}


def _gather(preset, logger):
    """(data for the renderer, filename, period label) for one preset."""
    gatherer = GATHERERS.get(preset["report_type"])
    if gatherer is None:
        raise ValueError(f"Unknown report type: {preset['report_type']}")
    return gatherer(preset, logger)


def _options(preset):
    """The preset's options, plus the tenant's departments for the annual report."""
    options = dict(preset["options"])
    if preset["report_type"] == "annual_utilization":
        options["departments"] = tenant.get_tenant()["ratedDepartments"]
    return options


def _render(preset, data, filename):
    """(content, content type) from the renderer, with the agency logo when one is mapped."""
    return renderer.render(
        preset["report_type"],
        data,
        _options(preset),
        filename,
        logo_base64=_logo_base64(preset["agency_name"]),
    )


def _save_copy(preset, filename, content):
    """File the rendered bytes in Saved Reports as the browser would; returns the saved row."""
    title, extension = os.path.splitext(filename)
    return saved_reports.save(
        content,
        filename,
        {
            "agency_name": preset["agency_name"] or "All Agencies",
            "agency_id": preset["agency_key"] or "",
            "report_type": SAVED_REPORT_TYPES.get(preset["report_type"], preset["report_type"]),
            "format": extension.lstrip("."),
            "title": title,
        },
    )


def _fill(template, values):
    """Replace each known `{placeholder}`; anything else, braces included, stays as typed.

    This is a plain substitution, not `str.format`: a stray `{`, an empty
    `{}` or a format spec such as `{agency:>6}` would make `format` raise
    and fail the run over a typo in the subject.
    """
    return _PLACEHOLDER.sub(lambda m: values.get(m.group(1), m.group(0)), template).strip()


def _html_body(text):
    """The delivery flow treats the body as HTML, so escape it and keep the line breaks.

    Quotes are left alone (`quote=False`): they are harmless as text nodes,
    and `&#x27;` in place of every apostrophe makes the flow's run history
    hard to read.
    """
    return html.escape(text, quote=False).replace("\n", "<br>")


def _long_date(t):
    """`November 1, 2026`, the client's `longDate` used in report headings."""
    return f"{calendar.month_name[t.month]} {t.day}, {t.year}"


def _placeholders(preset, period):
    return {
        "agency": preset["agency_name"],
        "report": REPORT_LABELS[preset["report_type"]],
        "period": period,
        "date": _long_date(_today()),
    }


def _deliver(schedule, preset, period, filename, content, content_type, logger):
    values = _placeholders(preset, period)
    logger(f"[INFO] Delivering {filename} to {', '.join(schedule['recipients_to'])}")
    delivery.send(
        to=schedule["recipients_to"],
        cc=schedule["recipients_cc"],
        subject=_fill(schedule["subject"], values),
        body=_html_body(_fill(schedule["body"], values)),
        attachments=[delivery.Attachment(filename, content, content_type)],
    )


def _preset_of(schedule):
    preset = presets.get(schedule["preset_id"])
    if preset is None:
        raise LookupError(f"Preset {schedule['preset_id']} no longer exists")
    return preset


def renderer_health():
    """The renderer's own health report; a RenderError when it is down."""
    return renderer.health()


def send_test_message(to):
    """Send one line with no attachment, so the page can prove the flow accepts mail."""
    delivery.send(to=to, cc=[], subject=TEST_SUBJECT, body=TEST_BODY, attachments=[])


def run_schedule(schedule_id, trigger, logger=print):
    """Execute one schedule now and return its finished run row.

    `trigger` is recorded on the run (`TRIGGER_SCHEDULE` for the loop,
    `TRIGGER_MANUAL` for the page's run-now button, or whatever a caller
    names). A scheduled trigger also moves `next_run_at` forward, as the
    first step inside the run so that a crash mid-run cannot leave the
    schedule due again on the loop's next tick and a failure to advance is
    recorded on the run row. Every failure is recorded on the run and the
    schedule rather than raised; only an unknown schedule id raises.
    """
    schedule = schedules.existing(schedule_id)
    run_id = schedule_repo.insert_run(schedule_id, trigger)
    saved_report_id = None
    try:
        if trigger == schedule_repo.TRIGGER_SCHEDULE:
            schedules.advance(schedule)
        preset = _preset_of(schedule)
        label = REPORT_LABELS[preset["report_type"]]
        logger(
            f"[INFO] Run {run_id} ({trigger}): {label} for {preset['agency_name'] or 'all agencies'}"
        )

        data, filename, period = _gather(preset, logger)
        logger(f"[INFO] Rendering {filename}")
        content, content_type = _render(preset, data, filename)
        saved_report_id = _save_copy(preset, filename, content)["id"]
        logger(f"[INFO] Saved report {saved_report_id} ({len(content)} bytes)")
        _deliver(schedule, preset, period, filename, content, content_type, logger)

        schedule_repo.finish_run(run_id, schedule_repo.STATUS_OK, saved_report_id=saved_report_id)
        schedules.record_result(schedule_id, schedule_repo.STATUS_OK)
        logger(f"[INFO] Run {run_id} delivered")
    except Exception as exc:
        error = str(exc) or type(exc).__name__
        logger(f"[ERROR] Run {run_id} failed: {error}")
        schedule_repo.finish_run(
            run_id, schedule_repo.STATUS_ERROR, error=error, saved_report_id=saved_report_id
        )
        schedules.record_result(schedule_id, schedule_repo.STATUS_ERROR, error)
    return schedule_repo.list_runs(schedule_id, limit=1)[0]
