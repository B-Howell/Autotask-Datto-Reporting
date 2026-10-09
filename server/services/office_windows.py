"""Windows and Office version counts for one agency's end-user machines.

The device list comes from Autotask (minus servers, VMs and pending-retired
machines); the OS counted is the one Datto's agent reports live, falling back
to Autotask's audit field for machines Datto does not know. Office comes from
each device's Datto software audit.
"""

import json

from core.progress import Phases
from integrations.autotask import autotask
from integrations.datto import datto
from repositories.snapshots import Snapshot, get_cached_rows
from services import device_audit
from services.common import is_pending_retired, is_virtual_machine, udf_values

OW_PHASES = ["Collecting devices", "Reading installed software", "Building the report"]

ITEM_FIELDS = [
    "id",
    "referenceTitle",
    "rmmDeviceAuditOperatingSystem",
    "productID",
    "isActive",
    "rmmDeviceAuditModelID",
]
WINDOWS_VERSIONS = ("Windows 10", "Windows 11")


def snapshot(company_id, site_uid):
    return Snapshot(
        "office_windows", "office_windows_counts", {"company_id": company_id, "site_id": site_uid}
    )


# ── Autotask ───────────────────────────────────────────────────────────────


def collect_device_ids(company_id, phases):
    items = autotask().query_all(
        "ConfigurationItems",
        [
            {"op": "eq", "field": "companyID", "value": company_id},
            {"op": "eq", "field": "isActive", "value": True},
        ],
        ["id"],
        on_page=lambda count: phases.update(done=count),
    )
    return [item["id"] for item in items]


def load_devices(ids):
    """Active devices with their UDFs attached as `udf_fields`.

    Autotask only returns userDefinedFields when includeFields is omitted, so
    the UDFs are a second pass over the same ids.
    """
    client = autotask()
    items = [d for d in client.query_by_ids("ConfigurationItems", ids, ITEM_FIELDS) if d]
    udf_map = {d["id"]: udf_values(d) for d in client.query_by_ids("ConfigurationItems", ids)}
    for item in items:
        item["udf_fields"] = udf_map.get(item["id"], {})
    return items


def product_names(items):
    ids = list({i.get("productID") for i in items if i.get("productID")})
    if not ids:
        return {}
    return {p["id"]: p["name"] for p in autotask().query_by_ids("Products", ids, ["id", "name"])}


def without_servers_and_vms(items, logger):
    """Drop server product types and known VM models, as the device report does."""
    products = product_names(items)
    models = autotask().picklist("ConfigurationItems", "rmmDeviceAuditModelID")
    kept = [
        d
        for d in items
        if "server" not in (products.get(d.get("productID"), "") or "").lower()
        and not is_virtual_machine(models.get(d.get("rmmDeviceAuditModelID"), ""))
    ]
    logger(f"[INFO] Filtered out {len(items) - len(kept)} servers/VMs; {len(kept)} devices remain")
    return kept


def hostname_of(device):
    return (device.get("referenceTitle") or "").strip()


# ── counting ───────────────────────────────────────────────────────────────


def datto_os_by_hostname(site_uid, logger):
    """{HOSTNAME: operatingSystem} as reported live by the Datto agents in a site."""
    os_map = {}
    for d in datto().site_devices(site_uid, logger=logger):
        host = (d.get("hostname") or "").strip().upper()
        if host:
            os_map[host] = d.get("operatingSystem", "") or ""
    logger(f"[INFO] Loaded Datto OS for {len(os_map)} devices in site")
    return os_map


def os_string(device, datto_os):
    """Datto's live OS when it has one, else Autotask's audit field; lower-cased."""
    host = hostname_of(device)
    live = datto_os.get(host.upper()) if host else None
    if live:
        return live.lower()
    audited = device.get("rmmDeviceAuditOperatingSystem", "")
    return audited.lower() if isinstance(audited, str) else ""


def count_os_versions(devices, datto_os, logger):
    """[{name, installs, devices}] for each Windows client version.

    Autotask's product type is not consulted here: anything running a client
    Windows is counted however it is classified. Server SKUs say "Windows
    Server" and are skipped on that.
    """
    counts = dict.fromkeys(WINDOWS_VERSIONS, 0)
    hosts = {name: [] for name in WINDOWS_VERSIONS}
    for device in devices:
        if not isinstance(device, dict) or is_pending_retired(device.get("udf_fields", {})):
            continue
        os_str = os_string(device, datto_os)
        if "windows server" in os_str:
            continue
        version = next((v for v in WINDOWS_VERSIONS if v.lower() in os_str), None)
        if version is None:
            continue
        counts[version] += 1
        if hostname_of(device):
            hosts[version].append(hostname_of(device))
    logger(
        "[INFO] OS Counts (Datto-sourced) - "
        + ", ".join(f"{name}: {counts[name]}" for name in WINDOWS_VERSIONS)
    )
    return [{"name": n, "installs": counts[n], "devices": hosts[n]} for n in WINDOWS_VERSIONS]


def count_office_versions(site_uid, devices, phases, logger):
    """[{name, installs, devices}] bucketing each device by its primary Office product."""
    hostnames = [
        hostname_of(d)
        for d in devices
        if hostname_of(d) and not is_pending_retired(d.get("udf_fields", {}))
    ]
    logger(f"[INFO] {len(hostnames)} non-pending devices for Office lookup")
    logger(f"[INFO] Getting Office versions from Datto for {len(hostnames)} devices")
    phases.start(OW_PHASES[1], done=0, total=len(hostnames))
    primary = device_audit.primary_office_by_device(
        site_uid, hostnames, logger, phases, OW_PHASES[1]
    )
    by_product = {}
    for host, label in primary.items():
        by_product.setdefault(label, []).append(host)
    logger(f"[INFO] Found Office versions: {dict((k, len(v)) for k, v in by_product.items())}")
    return [{"name": n, "installs": len(h), "devices": h} for n, h in by_product.items()]


# ── pipeline ───────────────────────────────────────────────────────────────


def to_row(kind, item):
    return {
        "kind": kind,
        "product": item.get("name"),
        "installs": item.get("installs") or 0,
        "devices_json": json.dumps(item.get("devices") or []),
    }


def fetch_rows(company_id, site_uid, logger=print):
    """Live count rows: {kind: 'os'|'office', product, installs, devices_json}."""
    logger(f"[INFO] Getting Office/Windows breakdown for company {company_id}")
    phases = Phases(logger, OW_PHASES)
    phases.start(OW_PHASES[0])

    devices = load_devices(collect_device_ids(company_id, phases))
    logger(f"[INFO] Found {len(devices)} active devices in Autotask")
    devices = without_servers_and_vms(devices, logger)

    windows = count_os_versions(devices, datto_os_by_hostname(site_uid, logger), logger)
    office = count_office_versions(site_uid, devices, phases, logger)
    phases.done()
    return [to_row("os", i) for i in windows] + [to_row("office", i) for i in office]


def aggregate(rows):
    """{windows_installs, office_installs} from stored or fetched rows."""

    def to_item(row):
        try:
            devices = json.loads(row.get("devices_json") or "[]")
        except (json.JSONDecodeError, TypeError):
            devices = []
        return {
            "name": row.get("product"),
            "installs": row.get("installs") or 0,
            "devices": devices,
        }

    return {
        "windows_installs": [to_item(r) for r in rows if r.get("kind") == "os"],
        "office_installs": [to_item(r) for r in rows if r.get("kind") == "office"],
    }


def get_office_windows(company_id, site_uid, logger=print, refresh=False):
    """Read-through cached Office/Windows breakdown for one (company, site)."""
    rows, synced_at, cached = get_cached_rows(
        snapshot(company_id, site_uid),
        lambda log: fetch_rows(company_id, site_uid, log),
        refresh=refresh,
        logger=logger,
    )
    if cached:
        logger(f"[INFO] Office/Windows served from cache (synced_at={synced_at})")
    result = aggregate(rows)
    result["synced_at"] = synced_at
    return result


def refresh_snapshot(company_id, site_uid, logger=print):
    return get_cached_rows(
        snapshot(company_id, site_uid),
        lambda log: fetch_rows(company_id, site_uid, log),
        refresh=True,
        logger=logger,
    )
