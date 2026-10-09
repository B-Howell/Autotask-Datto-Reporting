"""Patch Management summary for one Datto site: a status donut plus the workstation list.

Mirrors Datto's own Patch Management report, which covers desktops and laptops
only; servers and network devices in the same site are left out.
"""

from core.progress import Phases
from integrations.datto import datto
from repositories.snapshots import Snapshot, get_cached_rows
from services.common import strip_domain

# Datto patchStatus enum -> report label, in the order the donut segments and
# legend render.
PATCH_STATUS_LABELS = [
    ("FullyPatched", "Fully Patched"),
    ("ApprovedPending", "Approved Pending"),
    ("InstallError", "Install Error"),
    ("RebootRequired", "Reboot Required"),
    ("NoData", "No Data"),
    ("NoPolicy", "No Policy"),
]
_STATUS_TO_LABEL = dict(PATCH_STATUS_LABELS)

# Device-table order: worst first (the reverse of the legend). Unknown
# statuses sort to the bottom.
_STATUS_SEVERITY = {status: rank for rank, (status, _) in enumerate(reversed(PATCH_STATUS_LABELS))}
_UNKNOWN_SEVERITY = len(PATCH_STATUS_LABELS)

# Datto deviceType.category values that the native report groups as workstations.
_WORKSTATION_CATEGORIES = {
    "desktops",
    "laptops",
    "workstations",
    "desktop",
    "laptop",
    "workstation",
}

PATCH_PHASES = ["Collecting devices from Datto", "Building the report"]


def snapshot(site_uid):
    return Snapshot("patch", "patch_rows", {"site_id": site_uid})


def category_of(device):
    return ((device.get("deviceType") or {}).get("category") or "").strip()


def is_workstation(device):
    return category_of(device).lower() in _WORKSTATION_CATEGORIES


def patch_row(device):
    pm = device.get("patchManagement") or {}
    status = pm.get("patchStatus") or "NoData"
    return {
        "hostname": device.get("hostname") or "",
        "description": device.get("description") or "",
        "last_user": strip_domain(device.get("lastLoggedInUser")),
        "last_reboot": device.get("lastReboot") or "",
        "installed": pm.get("patchesInstalled") or 0,
        "approved_pending": pm.get("patchesApprovedPending") or 0,
        "not_approved": pm.get("patchesNotApproved") or 0,
        "status": status,
        "status_label": _STATUS_TO_LABEL.get(status, status),
    }


def workstation_rows(devices, logger):
    """One row per live workstation, sorted by hostname; logs what was excluded and why."""
    rows = []
    skipped = {}
    for device in devices:
        # Suspended and deleted agents are not live machines.
        if device.get("suspended") or device.get("deleted"):
            continue
        if not is_workstation(device):
            category = category_of(device) or "(none)"
            skipped[category] = skipped.get(category, 0) + 1
            continue
        rows.append(patch_row(device))
    if skipped:
        logger(f"[INFO] Excluded non-workstation devices by category: {skipped}")
    rows.sort(key=lambda r: (r["hostname"] or "").upper())
    return rows


def fetch_rows(site_uid, logger=print):
    """Live workstation patch rows for one Datto site."""
    logger(f"[INFO] Fetching Datto devices for patch report, site {site_uid}")
    phases = Phases(logger, PATCH_PHASES)
    phases.start(PATCH_PHASES[0])
    devices = datto().site_devices(
        site_uid, logger=logger, on_page=lambda count: phases.update(done=count)
    )
    logger(f"[INFO] Retrieved {len(devices)} total devices from Datto")
    phases.done()
    return workstation_rows(devices, logger)


def aggregate(rows):
    """Donut summary plus the device list, worst status first then by hostname."""
    counts = {status: 0 for status, _ in PATCH_STATUS_LABELS}
    for row in rows:
        counts[row["status"]] = counts.get(row["status"], 0) + 1
    summary = [
        {"status": status, "label": label, "count": counts.get(status, 0)}
        for status, label in PATCH_STATUS_LABELS
    ]
    devices = [
        {
            "hostname": r.get("hostname") or "",
            "description": r.get("description") or "",
            # Applied on read too, so snapshots stored before the domain was
            # stripped display correctly without a resync.
            "last_user": strip_domain(r.get("last_user")),
            "last_reboot": r.get("last_reboot") or "",
            "installed": r.get("installed") or 0,
            "approved_pending": r.get("approved_pending") or 0,
            "not_approved": r.get("not_approved") or 0,
            "status": r.get("status"),
            "status_label": r.get("status_label"),
        }
        for r in rows
    ]
    devices.sort(
        key=lambda d: (
            _STATUS_SEVERITY.get(d["status"], _UNKNOWN_SEVERITY),
            (d["hostname"] or "").upper(),
        )
    )
    return {"summary": summary, "devices": devices, "device_count": len(devices)}


def get_patch_report(site_uid, logger=print, refresh=False):
    """Read-through cached Patch Management summary for one Datto site."""
    rows, synced_at, cached = get_cached_rows(
        snapshot(site_uid), lambda log: fetch_rows(site_uid, log), refresh=refresh, logger=logger
    )
    if cached:
        logger(f"[INFO] Patch report served from cache (synced_at={synced_at})")
    result = aggregate(rows)
    result["synced_at"] = synced_at
    return result


def refresh_snapshot(site_uid, logger=print):
    return get_cached_rows(
        snapshot(site_uid), lambda log: fetch_rows(site_uid, log), refresh=True, logger=logger
    )
