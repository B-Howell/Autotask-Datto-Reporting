"""Device inventory for one agency: Autotask configuration items, enriched from Datto.

Autotask holds the record of each machine (product type, serial, location,
user-defined fields); Datto holds what the agent last reported (last seen,
installed Office, RAM, C: drive). The two are joined on hostname.
"""

import json
from datetime import datetime

from core.progress import Phases
from integrations.autotask import autotask
from integrations.datto import datto
from report_rules import (
    EDITABLE_DEVICE_FIELDS,
    END_USER_DEVICE_TYPES,
    UDF_DEPARTMENT,
    UDF_PRIMARY_USER,
    UDF_PURCHASE_DATE,
)
from repositories.snapshots import Snapshot, get_cached_rows, read_rows
from services import device_audit
from services.common import is_pending_retired, is_virtual_machine, strip_domain, udf_values

DEVICE_PHASES = [
    "Collecting devices from Autotask",
    "Loading device details",
    "Reading Datto audit data",
    "Building the sheet",
]

# Sheet column label -> row field, in display order. The fields are also the
# device_rows columns, so cached rows round-trip through SQLite unchanged.
SHEET_COLUMNS = [
    ("Product", "type"),
    ("Reference Name", "name"),
    ("Serial Number", "serial"),
    ("IP Address Internal", "ip"),
    ("Primary User or Role", "primary_user_or_role"),
    ("Purchase Date", "purchase_date"),
    ("Department", "department"),
    ("Location", "location"),
    ("Last User", "last_user"),
    ("Last Seen", "last_seen"),
    ("Manufacturer", "manufacturer"),
    ("Model", "model"),
    ("Processor", "processor"),
    ("Memory GB", "memory_gb"),
    ("Storage GB", "storage_gb"),
    ("Operating System", "operating_system"),
    ("Office Version", "office_version"),
    ("Antivirus Status", "antivirus_status"),
    ("Patch Status", "patch_status"),
]
ROW_FIELDS = [field for _, field in SHEET_COLUMNS]
# Stored alongside the display columns so grid edits can be written back to
# the right configuration item.
STORED_FIELDS = [*ROW_FIELDS, "autotask_id"]

# Datto's audit is not always complete at the moment of a sync: a device can
# be missing its Office / RAM / disk entries in one audit cycle and have them
# in the next with no change on the machine. A snapshot replaces the whole
# scope, so these fields never downgrade a known value to blank.
CARRY_FORWARD_FIELDS = ("office_version", "memory_gb", "storage_gb")

ITEM_FIELDS = [
    "id",
    "referenceTitle",
    "serialNumber",
    "productID",
    "companyLocationID",
    "rmmDeviceAuditIPAddress",
    "rmmDeviceAuditLastUser",
    "rmmDeviceAuditOperatingSystem",
    "rmmDeviceAuditMemoryBytes",
    "rmmDeviceAuditStorageBytes",
    "rmmDeviceAuditManufacturerID",
    "rmmDeviceAuditModelID",
    "rmmDeviceAuditProcessorID",
    "rmmDeviceAuditAntivirusStatusID",
    "rmmDeviceAuditPatchStatusID",
]
PICKLIST_FIELDS = (
    "rmmDeviceAuditManufacturerID",
    "rmmDeviceAuditModelID",
    "rmmDeviceAuditProcessorID",
    "rmmDeviceAuditAntivirusStatusID",
    "rmmDeviceAuditPatchStatusID",
)
UNKNOWN = "Unknown"


def snapshot(company_id, site_id):
    return Snapshot("devices", "device_rows", {"company_id": company_id, "site_id": site_id})


def previous_rows(company_id, site_id):
    """The outgoing snapshot, read before the fetch replaces it."""
    return read_rows(snapshot(company_id, site_id))


# ── Autotask ───────────────────────────────────────────────────────────────


def collect_device_ids(company_id, phases, logger):
    phases.start(DEVICE_PHASES[0])
    items = autotask().query_all(
        "ConfigurationItems",
        [
            {"op": "eq", "field": "companyID", "value": company_id},
            {"op": "eq", "field": "isActive", "value": True},
        ],
        ["id"],
        on_page=lambda count: phases.update(done=count),
    )
    logger(f"[DONE] Total device IDs: {len(items)}")
    return [item["id"] for item in items]


def load_device_records(ids, phases, logger):
    """(items, {id: udf_fields}) for the device ids.

    Autotask only returns userDefinedFields when includeFields is omitted, so
    the fields and the UDFs are two passes over the same ids.
    """
    phases.start(DEVICE_PHASES[1], done=0, total=len(ids))
    client = autotask()
    items = client.query_by_ids("ConfigurationItems", ids, ITEM_FIELDS, on_chunk=phases.update)
    with_udfs = client.query_by_ids("ConfigurationItems", ids, on_chunk=phases.update)
    udf_map = {item["id"]: udf_values(item) for item in with_udfs}
    logger(f"[DONE] Total devices with UDFs: {len(udf_map)}")
    return items, udf_map


def name_map(entity, ids):
    ids = list({i for i in ids if i})
    if not ids:
        return {}
    return {r["id"]: r["name"] for r in autotask().query_by_ids(entity, ids, ["id", "name"])}


def resolve_lookups(items):
    """Id -> label maps for every reference field on the device records."""
    client = autotask()
    lookups = {field: client.picklist("ConfigurationItems", field) for field in PICKLIST_FIELDS}
    lookups["productID"] = name_map("Products", (i.get("productID") for i in items))
    lookups["companyLocationID"] = name_map(
        "CompanyLocations", (i.get("companyLocationID") for i in items)
    )
    return lookups


def device_type(product_name):
    """'RMM_Laptop' -> 'Laptop'; None when the product is not an end-user machine."""
    product = product_name if isinstance(product_name, str) else ""
    kind = product.replace("RMM_", "").strip()
    return kind if kind.lower() in END_USER_DEVICE_TYPES else None


def format_purchase_date(raw):
    if not raw:
        return ""
    try:
        return datetime.fromisoformat(raw.split("T")[0]).strftime("%m/%d/%Y")
    except ValueError:
        return ""


def gigabytes(byte_count):
    return round(byte_count / (1024**3), 1) if byte_count else ""


def device_row(item, udf_fields, lookups):
    """A sheet row for one configuration item, or None when it is not reported on."""
    if is_pending_retired(udf_fields):
        return None

    def label(field):
        return lookups[field].get(item.get(field), UNKNOWN)

    kind = device_type(label("productID"))
    if kind is None or is_virtual_machine(label("rmmDeviceAuditModelID")):
        return None
    return {
        "autotask_id": item.get("id"),
        "type": kind,
        "name": item.get("referenceTitle", ""),
        "serial": item.get("serialNumber", ""),
        "ip": item.get("rmmDeviceAuditIPAddress", ""),
        "primary_user_or_role": udf_fields.get(UDF_PRIMARY_USER, ""),
        "purchase_date": format_purchase_date(udf_fields.get(UDF_PURCHASE_DATE)),
        "department": udf_fields.get(UDF_DEPARTMENT, ""),
        "location": label("companyLocationID"),
        "last_user": strip_domain(item.get("rmmDeviceAuditLastUser", "")),
        "last_seen": "",
        "manufacturer": label("rmmDeviceAuditManufacturerID"),
        "model": label("rmmDeviceAuditModelID"),
        "processor": label("rmmDeviceAuditProcessorID"),
        "memory_gb": gigabytes(item.get("rmmDeviceAuditMemoryBytes", 0)),
        "storage_gb": gigabytes(item.get("rmmDeviceAuditStorageBytes", 0)),
        "operating_system": item.get("rmmDeviceAuditOperatingSystem", ""),
        "office_version": "",
        "antivirus_status": label("rmmDeviceAuditAntivirusStatusID"),
        "patch_status": label("rmmDeviceAuditPatchStatusID"),
    }


def build_rows(items, udf_map, lookups):
    rows = (device_row(item, udf_map.get(item["id"], {}), lookups) for item in items if item)
    return [row for row in rows if row]


# ── Datto ──────────────────────────────────────────────────────────────────


def last_seen_by_hostname(site_id, logger):
    """{HOSTNAME: lastSeen epoch ms} for the agents in a Datto site."""
    devices = datto().account_devices(site_id, logger=logger)
    logger(f"[DONE] Total Datto devices retrieved: {len(devices)}")
    return {d["hostname"].strip().upper(): d.get("lastSeen") for d in devices if d.get("hostname")}


def format_last_seen(epoch_ms):
    if not epoch_ms:
        return ""
    return datetime.fromtimestamp(epoch_ms / 1000).strftime("%m/%d/%Y %I:%M:%S %p")


def apply_datto(rows, last_seen, enrichment, logger):
    """Overlay what the Datto agent reports; Autotask's RAM/disk stay when Datto has none."""
    for row in rows:
        host = (row.get("name") or "").strip().upper()
        row["last_seen"] = format_last_seen(last_seen.get(host))
        info = enrichment.get(host) or {}
        row["office_version"] = info.get("office_version", "")
        if info.get("memory_gb") not in ("", None):
            row["memory_gb"] = info["memory_gb"]
        else:
            logger(f"[WARN] No Datto RAM data for {host}; keeping Autotask value")
        if info.get("storage_gb") not in ("", None):
            row["storage_gb"] = info["storage_gb"]
        else:
            logger(f"[WARN] No Datto C: drive data for {host}; keeping Autotask value")


def carry_forward_blanks(rows, prior_rows, logger):
    """Fill blank CARRY_FORWARD_FIELDS from the previous snapshot, by hostname."""
    prior = {}
    for row in prior_rows:
        name = (row.get("name") or "").strip().upper()
        if name:
            prior[name] = row

    carried = []
    for row in rows:
        previous = prior.get((row.get("name") or "").strip().upper())
        if not previous:
            continue
        for field in CARRY_FORWARD_FIELDS:
            is_blank = str(row.get(field, "") or "").strip() == ""
            had_value = str(previous.get(field, "") or "").strip() != ""
            if is_blank and had_value:
                row[field] = previous[field]
                carried.append(f"{row.get('name')}.{field}")

    if carried:
        logger(
            f"[INFO] Kept {len(carried)} previously-known value(s) that this fetch "
            f"returned blank: {', '.join(carried[:12])}" + (" ..." if len(carried) > 12 else "")
        )
    return rows


# ── pipeline ───────────────────────────────────────────────────────────────


def fetch_rows(company_id, site_id, logger=print):
    """Live device rows for one (company, Datto site), one dict per end-user machine."""
    prior_rows = previous_rows(company_id, site_id)
    phases = Phases(logger, DEVICE_PHASES)

    ids = collect_device_ids(company_id, phases, logger)
    items, udf_map = load_device_records(ids, phases, logger)
    rows = build_rows(items, udf_map, resolve_lookups(items))

    last_seen = last_seen_by_hostname(site_id, logger)
    logger("[INFO] Fetching Datto audit data (Office, RAM, C: drive)...")
    phases.start(DEVICE_PHASES[2])
    hostnames = [row["name"] for row in rows if row.get("name")]
    enrichment = device_audit.enrich_devices(
        site_id, hostnames, logger=logger, progress_phase=(phases, DEVICE_PHASES[2])
    )
    apply_datto(rows, last_seen, enrichment, logger)

    phases.done()
    rows = [
        {f: ("" if row.get(f) is None else row.get(f, "")) for f in STORED_FIELDS} for row in rows
    ]
    return carry_forward_blanks(rows, prior_rows, logger)


def build_sheet(rows):
    """Header row plus one row per device, in SHEET_COLUMNS order."""
    header = [label for label, _ in SHEET_COLUMNS]
    return [header] + [[row.get(field, "") for field in ROW_FIELDS] for row in rows]


def get_device_sheet(company_id, site_id, logger=print, refresh=False):
    """Read-through cached device sheet.

    `ids` holds the Autotask configuration item id for each body row of the
    sheet, in order, so edits can be written back; None for rows cached before
    the id was stored.
    """
    rows, synced_at, cached = get_cached_rows(
        snapshot(company_id, site_id),
        lambda log: fetch_rows(company_id, site_id, log),
        refresh=refresh,
        logger=logger,
    )
    if cached:
        logger(f"[INFO] Device sheet served from cache (synced_at={synced_at})")
    return {
        "sheet": build_sheet(rows),
        "ids": [row.get("autotask_id") for row in rows],
        "synced_at": synced_at,
        "cached": cached,
    }


def refresh_snapshot(company_id, site_id, logger=print):
    return get_cached_rows(
        snapshot(company_id, site_id),
        lambda log: fetch_rows(company_id, site_id, log),
        refresh=True,
        logger=logger,
    )


# ── write-back ─────────────────────────────────────────────────────────────


def group_changes(changes, logger):
    """{deviceId: {field: value}} from the grid's change list.

    Entries without a device id or naming a field that is not editable are
    dropped with a warning rather than sent: only the known user-defined
    fields may be written to a configuration item.
    """
    updates = {}
    for change in changes:
        device_id, field = change.get("deviceId"), change.get("field")
        if not device_id:
            logger(f"[WARN] Skipping change with missing deviceId: {change}")
            continue
        if field not in EDITABLE_DEVICE_FIELDS:
            logger(f"[WARN] Skipping change to non-editable field {field!r}: {change}")
            continue
        updates.setdefault(device_id, {})[field] = change.get("value")
    return updates


def patch_device_udfs(device_id, fields, logger):
    payload = {"userDefinedFields": [{"name": n, "value": v} for n, v in fields.items()]}
    try:
        logger(f"[POST] PATCH ConfigurationItems/{device_id}")
        logger(f"[POST] Payload: {json.dumps(payload)}")
        response = autotask().patch("ConfigurationItems", device_id, payload)
        logger(f"[POST] Response status for {device_id}: {response.status_code}")
        logger(f"[POST] Response body for {device_id}: {response.text}")
        return {"deviceId": device_id, "status": "ok"}
    except Exception as exc:
        logger(f"[ERROR] Failed to update device {device_id}: {exc}")
        return {"deviceId": device_id, "status": "error", "error": str(exc)}


def update_devices(changes, logger=print):
    """Write edited grid cells back to Autotask as configuration-item UDFs.

    Returns one {deviceId, status[, error]} per device touched.
    """
    logger("[INFO] Starting device update process")
    logger(f"[INFO] Raw changes input: {json.dumps(changes, indent=2)}")
    updates = group_changes(changes, logger)
    if not updates:
        logger("[WARN] No valid updates to apply. Nothing will be sent.")
        return []
    results = [patch_device_udfs(did, fields, logger) for did, fields in updates.items()]
    logger("[INFO] Device update process complete")
    return results
