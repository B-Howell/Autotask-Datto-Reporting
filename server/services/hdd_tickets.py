"""Disk-space alert tickets per device, for drive-upgrade recommendations.

The RMM raises an Autotask ticket whenever a workstation's C: drive crosses
its "near full" threshold. This report counts those tickets per still-active,
physical device and records the drive's capacity, so chronic offenders can be
put forward for an upgrade. Everything comes from Autotask: the ticket's
configurationItemID links to the device record (name, last user, active flag,
model), and the drive size is parsed from the ticket title because the
configuration item's storage field is a total across all disks.
"""

import re
from collections import Counter

from core.progress import Phases
from integrations.autotask import autotask
from report_rules import HDD_MONITORING_SOURCE, HDD_SUB_ISSUE_TYPE
from repositories.snapshots import Snapshot, get_cached_rows
from services.agencies import get_agencies
from services.common import is_virtual_machine, strip_domain

HDD_PHASES = ["Collecting tickets", "Resolving devices", "Building the report"]

# Alert titles look like:
#   "C: Drive has 217.9 GB used out of 237.9 GB (92% Used) ... for EXAMPLE-WS01"
# "out of <total>" is the capacity of that one drive.
_TITLE_RE = re.compile(r"([A-Za-z]):\s*Drive has .*?out of\s*([\d,.]+)\s*([GT])B", re.IGNORECASE)

TICKET_FIELDS = ["id", "configurationItemID", "title", "createDate"]
DEVICE_FIELDS = [
    "id",
    "referenceTitle",
    "rmmDeviceAuditLastUser",
    "rmmDeviceAuditModelID",
    "isActive",
]


def snapshot(company_id):
    return Snapshot("hdd", "hdd_ticket_rows", {"company_id": company_id})


def c_drive_gb(title):
    """Capacity in GB of the C: drive named in an alert title, or None."""
    match = _TITLE_RE.search(title or "")
    if not match or match.group(1).upper() != "C":
        return None
    size = float(match.group(2).replace(",", ""))
    if match.group(3).upper() == "T":
        size *= 1024
    return round(size, 1)


def _alert_tickets(company_id, logger, phases):
    phases.start("Collecting tickets")
    filters = [
        {"op": "eq", "field": "subIssueType", "value": HDD_SUB_ISSUE_TYPE},
        {"op": "eq", "field": "source", "value": HDD_MONITORING_SOURCE},
        {"op": "eq", "field": "companyID", "value": company_id},
    ]

    def on_page(count):
        logger(f"[INFO] HDD alert tickets: {count} so far…")
        phases.update(done=count)

    tickets = autotask().query_all("Tickets", filters, TICKET_FIELDS, on_page=on_page)
    logger(f"[INFO] Found {len(tickets)} HDD alert tickets")
    return tickets


def _alerts_by_device(tickets, logger):
    """{config item id: {count, c_gb, c_date}}, keeping the newest parsed capacity."""
    alerts = {}
    no_device = 0
    for ticket in tickets:
        ci_id = ticket.get("configurationItemID")
        if not ci_id:
            no_device += 1
            continue
        record = alerts.setdefault(ci_id, {"count": 0, "c_gb": None, "c_date": ""})
        record["count"] += 1
        size = c_drive_gb(ticket.get("title"))
        date = ticket.get("createDate") or ""
        # ISO timestamps sort lexically, so a string compare finds the latest alert.
        if size is not None and date >= record["c_date"]:
            record["c_date"] = date
            record["c_gb"] = size
    if no_device:
        logger(f"[INFO] {no_device} tickets had no linked device (skipped)")
    return alerts


def _devices(ci_ids, logger, phases):
    """{config item id: record} for the devices the alerts refer to."""
    logger(f"[INFO] Resolving {len(ci_ids)} devices…")
    phases.start("Resolving devices", done=0, total=len(ci_ids))
    items = autotask().query_by_ids(
        "ConfigurationItems",
        ci_ids,
        DEVICE_FIELDS,
        on_chunk=lambda done, total: phases.update(done=done, total=total),
    )
    return {item["id"]: item for item in items}


def _exclusion(item, model_labels):
    """Why a device is left out of the report, or None to keep it."""
    if not item.get("isActive"):
        return "inactive"  # the point is upgrading PCs still in use
    if is_virtual_machine(model_labels.get(item.get("rmmDeviceAuditModelID"), "")):
        return "vm"
    return None


def _device_rows(alerts, devices, model_labels, logger):
    rows = []
    excluded = Counter()
    for ci_id, record in alerts.items():
        item = devices.get(ci_id)
        if not item:
            continue  # the configuration item no longer exists
        reason = _exclusion(item, model_labels)
        if reason:
            excluded[reason] += 1
            continue
        rows.append(
            {
                "device_name": item.get("referenceTitle") or "",
                "ticket_count": record["count"],
                "last_user": strip_domain(item.get("rmmDeviceAuditLastUser")),
                "c_drive_gb": record["c_gb"],
            }
        )
    if excluded["inactive"]:
        logger(f"[INFO] Excluded {excluded['inactive']} inactive/retired devices")
    if excluded["vm"]:
        logger(f"[INFO] Excluded {excluded['vm']} virtual machines")
    return rows


def fetch_rows(company_id, logger=print):
    """Per-device rows for one agency: active, physical devices with C:-drive alerts."""
    logger(f"[INFO] HDD storage tickets for company {company_id}")
    phases = Phases(logger, HDD_PHASES)
    alerts = _alerts_by_device(_alert_tickets(company_id, logger, phases), logger)
    devices = _devices(list(alerts), logger, phases)
    phases.start("Building the report")
    model_labels = autotask().picklist("ConfigurationItems", "rmmDeviceAuditModelID")
    rows = _device_rows(alerts, devices, model_labels, logger)
    phases.done()
    logger(f"[DONE] {len(rows)} active devices with HDD tickets for company {company_id}")
    return rows


def _cached_device_rows(company_ids, logger, refresh):
    """(rows across all companies, oldest synced_at, whether every company was cached)."""
    rows, synced_at, all_cached = [], None, bool(company_ids)
    for cid in company_ids:
        company_rows, company_synced, cached = get_cached_rows(
            snapshot(cid),
            lambda log, cid=cid: fetch_rows(cid, log),
            refresh=refresh,
            logger=logger,
        )
        rows.extend(company_rows)
        all_cached = all_cached and cached
        if company_synced and (synced_at is None or company_synced < synced_at):
            synced_at = company_synced  # the report is only as fresh as its oldest member
    return rows, synced_at, all_cached


def _device_list(rows):
    """Report devices, worst offenders first and then by name."""
    devices = [
        {
            "device_name": r.get("device_name") or "",
            "ticket_count": r.get("ticket_count") or 0,
            "last_user": r.get("last_user") or "",
            "c_drive_gb": r.get("c_drive_gb"),
        }
        for r in rows
    ]
    devices.sort(key=lambda d: (-d["ticket_count"], d["device_name"].upper()))
    return devices


def get_hdd_report(company_ids=None, logger=print, refresh=False):
    """Read-through cached HDD report; falsy company_ids means every agency."""
    if not company_ids:
        company_ids = [a["id"] for a in get_agencies()]
    rows, synced_at, cached = _cached_device_rows(company_ids, logger, refresh)
    if cached:
        logger(f"[INFO] HDD report served from cache (synced_at={synced_at})")
    devices = _device_list(rows)
    return {"devices": devices, "device_count": len(devices), "synced_at": synced_at}


def refresh_snapshot(company_id, logger=print):
    return get_cached_rows(
        snapshot(company_id), lambda log: fetch_rows(company_id, log), refresh=True, logger=logger
    )
