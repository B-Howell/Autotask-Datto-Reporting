"""One scheduled run: gather the data, render the file, keep a copy, deliver it.

The services do the fetching exactly as they do for the browser; the renderer
produces the same bytes the browser's export button would; the saved copy
lands in Saved Reports under the filename the browser would have used, so a
delivered file can always be reopened and a manual save of the same report on
the same day replaces it rather than sitting beside it.
"""

import base64
import html
from datetime import date

from integrations import delivery, renderer
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
MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
]


def _today():
    return date.today()


def _stamp():
    """M-D-YY without zero padding, the browser's `fileDateStamp`."""
    t = _today()
    return f"{t.month}-{t.day}-{t.year % 100:02d}"


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


def _gather(preset, logger):
    """(data for the renderer, filename, period label) for one preset.

    Each branch assembles the same payload the browser hands the matching
    export builder, and names the file the way that page does, so the saved
    copy dedupes against a manual export of the same day.
    """
    report_type = preset["report_type"]
    agency = preset["agency_name"]
    today = _today()

    if report_type == "devices":
        sheets = []
        for member in _members(preset):
            logger(f"[INFO] Gathering devices for {member['name']}")
            sheet = devices.get_device_sheet(member["id"], member["site"], logger=logger)
            sheets.append(
                {"sheet": sheet["sheet"], "ids": sheet["ids"], "companyName": member["name"]}
            )
        return {"sheets": sheets}, f"{agency} Computer Inventory {_stamp()}.xlsx", ""

    if report_type == "office_windows":
        members = _members(preset)
        if len(members) > 1:
            logger(
                f"[WARN] {agency} has {len(members)} members; the Office and Windows "
                f"report covers only {members[0]['name']}"
            )
        member = members[0]
        logger(f"[INFO] Gathering Office and Windows installs for {member['name']}")
        breakdown = office_windows.get_office_windows(member["id"], member["site"], logger=logger)
        data = {
            "breakdown": breakdown,
            "manualInputs": manual_inputs.get_manual_inputs(preset["agency_key"], report_type),
            "agencyName": agency,
        }
        extension = preset["options"].get("format", "docx")
        return data, f"{agency} Office and Windows Installs {_stamp()}.{extension}", ""

    if report_type == "patch":
        members = _members(preset)
        if len(members) > 1:
            logger(
                f"[WARN] {agency} has {len(members)} members; the patch report covers only "
                f"{members[0]['name']}"
            )
        member = members[0]
        logger(f"[INFO] Gathering patch status for {member['name']}")
        report = patch_management.get_patch_report(member["site"], logger=logger)
        data = {
            "report": report,
            "agency": {"id": member["id"], "site": member["site"], "name": agency},
        }
        return data, f"{agency} Patch Management Summary {_stamp()}.pdf", ""

    if report_type == "hdd_tickets":
        ids = [member["id"] for member in _members(preset)]
        logger(f"[INFO] Gathering disk-space tickets for {agency}")
        report = hdd_tickets.get_hdd_report(ids, logger=logger)
        return {"devices": report["devices"]}, f"{agency} HDD Storage Tickets {_stamp()}.xlsx", ""

    if report_type == "sla":
        year, month = periods.previous_month(today)
        period = f"{MONTHS[month - 1]} {year}"
        logger(f"[INFO] Gathering SLA performance for {period}")
        report = sla.get_sla_report(year, month, logger=logger)
        return report, f"SLA Performance By Ticket {MONTHS[month - 1]}{year}.xlsx", period

    if report_type == "quarterly_utilization":
        start, end = periods.previous_quarter(today)
        period = utilization.period_label(start, end)
        logger(f"[INFO] Gathering utilization for {period}")
        report = utilization.get_utilization(start, end, logger=logger)
        return report, f"Agency Utilization {period}.xlsx", period

    if report_type == "annual_utilization":
        start, end = periods.fiscal_year_of_previous_month(today)
        period = utilization.period_label(start, end)
        logger(f"[INFO] Gathering annual utilization for {period}")
        report = utilization.get_utilization(start, end, logger=logger)
        entries = utilization.get_entries(start, end, logger=logger)
        return {"utilData": report, "entries": entries}, f"Annual Utilization {period}.xlsx", period

    raise ValueError(f"Unknown report type: {report_type}")


def _options(preset):
    """The preset's options, plus the tenant's departments for the annual report."""
    options = dict(preset["options"])
    if preset["report_type"] == "annual_utilization":
        options["departments"] = tenant.get_tenant()["ratedDepartments"]
    return options


def _fill(template, values):
    """`str.format` that leaves an unknown `{placeholder}` in place instead of failing."""

    class Safe(dict):
        def __missing__(self, key):
            return "{" + key + "}"

    return template.format_map(Safe(values)).strip()


def _html_body(text):
    """The delivery flow treats the body as HTML, so escape it and keep the line breaks."""
    return html.escape(text).replace("\n", "<br>")


def _placeholders(preset, period):
    return {
        "agency": preset["agency_name"],
        "report": REPORT_LABELS[preset["report_type"]],
        "period": period,
        "date": _today().isoformat(),
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


def run_schedule(schedule_id, trigger, logger=print):
    """Execute one schedule now and return its finished run row.

    `trigger` is recorded on the run (`schedule` for the loop, `manual` for
    the page's run-now button, or whatever a caller names). A `schedule`
    trigger also moves `next_run_at` forward, and does so before any work
    starts so a crash mid-run cannot leave the schedule due again on the
    loop's next tick. Every failure is recorded on the run and the schedule
    rather than raised; only an unknown schedule id raises.
    """
    schedule = schedules.get(schedule_id)
    if schedule is None:
        raise LookupError("No such schedule")
    if trigger == "schedule":
        schedules.advance(schedule)
    run_id = schedule_repo.insert_run(schedule_id, trigger)
    saved_report_id = None
    try:
        preset = presets.get(schedule["preset_id"])
        if preset is None:
            raise LookupError(f"Preset {schedule['preset_id']} no longer exists")
        label = REPORT_LABELS[preset["report_type"]]
        logger(
            f"[INFO] Run {run_id} ({trigger}): {label} for {preset['agency_name'] or 'all agencies'}"
        )

        data, filename, period = _gather(preset, logger)
        logger(f"[INFO] Rendering {filename}")
        content, content_type = renderer.render(
            preset["report_type"],
            data,
            _options(preset),
            filename,
            logo_base64=_logo_base64(preset["agency_name"]),
        )

        saved = saved_reports.save(
            content,
            filename,
            {
                "agency_name": preset["agency_name"] or "All Agencies",
                "agency_id": preset["agency_key"] or "",
                "report_type": SAVED_REPORT_TYPES.get(preset["report_type"], preset["report_type"]),
                "format": filename.rsplit(".", 1)[-1],
                "title": filename.rsplit(".", 1)[0],
            },
        )
        saved_report_id = saved["id"]
        logger(f"[INFO] Saved report {saved_report_id} ({len(content)} bytes)")

        _deliver(schedule, preset, period, filename, content, content_type, logger)
        schedule_repo.finish_run(run_id, "ok", saved_report_id=saved_report_id)
        schedules.record_result(schedule_id, "ok")
        logger(f"[INFO] Run {run_id} delivered")
    except Exception as exc:
        error = str(exc) or type(exc).__name__
        logger(f"[ERROR] Run {run_id} failed: {error}")
        schedule_repo.finish_run(run_id, "error", error=error, saved_report_id=saved_report_id)
        schedules.record_result(schedule_id, "error", error)
    return schedule_repo.list_runs(schedule_id, limit=1)[0]
