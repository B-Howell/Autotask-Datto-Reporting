"""Per-device enrichment from Datto's audit API: Office product, RAM and C: drive.

Datto's REST API has no bulk audit endpoint, so this is one or two calls per
device, run on a small thread pool and paced by the client. A device whose
agent lives in a different Datto site than its agency is found by a second,
account-wide pass.
"""

import concurrent.futures
import re

from integrations.datto import datto

KNOWN_OFFICE_YEARS = ("2024", "2021", "2019", "2016", "2013", "2010")

# Installed-RAM and drive sizes are reported in usable bytes, always a little
# under the marketing size; round up to the smallest standard size that fits.
STANDARD_RAM_GB = (1, 2, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512)
STANDARD_STORAGE_GB = (
    32, 64, 128, 240, 256, 480, 500, 512, 750, 960, 1000, 1024,
    1500, 2000, 2048, 3000, 4000, 4096, 8000, 8192,
)  # fmt: skip

_OFFICE_SKIP_MARKERS = (
    "language pack",
    "proofing tools",
    "mui",
    "shared 32-bit",
    "shared 64-bit",
    "shared components",
    "click-to-run extensibility",
    "interactive training",
    "communicator",
    "groove server",
)
_OFFICE_EDITIONS = (
    ("professional plus", "Professional Plus"),
    ("professional", "Professional"),
    ("standard", "Standard"),
    ("home and business", "Home and Business"),
    ("home and student", "Home and Student"),
    ("home & student", "Home and Student"),
)


def round_up_to_standard(value, sizes, tolerance):
    try:
        value = float(value)
    except (TypeError, ValueError):
        return ""
    if value <= 0:
        return ""
    for size in sizes:
        if value <= size + tolerance:
            return size
    return int(round(value))


def round_ram_gb(gb):
    return round_up_to_standard(gb, STANDARD_RAM_GB, 0.1)


def round_storage_gb(gb):
    return round_up_to_standard(gb, STANDARD_STORAGE_GB, 0.5)


def classify_office(software_name):
    """Normalise an installed-software name to an Office product label, or None.

    "Microsoft 365 Apps for business - en-us" -> "Microsoft 365 Business";
    "Microsoft Office Standard 2019 w/ Access" -> "Office Standard 2019 w/ Access".
    Components that ship alongside Office (language packs, shared runtimes)
    are ignored so one install is counted once.
    """
    if not software_name:
        return None
    name = software_name.strip()
    lower = name.lower()

    if (
        "microsoft 365" in lower
        or "m365" in lower
        or "office 365" in lower
        or ("click-to-run" in lower and "office" in lower)
    ):
        for marker, label in (
            ("enterprise", "Enterprise"),
            ("business", "Business"),
            ("basic", "Basic"),
        ):
            if marker in lower:
                return f"Microsoft 365 {label}"
        return "Microsoft 365"

    if "microsoft office" not in lower or any(m in lower for m in _OFFICE_SKIP_MARKERS):
        return None

    year = next((y for y in KNOWN_OFFICE_YEARS if y in name), None)
    if not year:
        return None

    parts = ["Office"]
    if "ltsc" in lower:
        parts.append("LTSC")
    edition = next((label for marker, label in _OFFICE_EDITIONS if marker in lower), None)
    if edition:
        parts.append(edition)
    parts.append(year)
    label = " ".join(parts)
    if re.search(r"\bw[/ ]+access\b|\bwith access\b", lower):
        label += " w/ Access"
    return label


def primary_office_label(labels):
    """The one Office product a device is counted under when several are installed.

    A specific Microsoft 365 plan wins over the bare family name, and the
    newest perpetual edition wins among those.
    """
    unique = list(dict.fromkeys(label for label in labels if label))
    if not unique:
        return None
    specific = [
        label
        for label in unique
        if label in ("Microsoft 365 Enterprise", "Microsoft 365 Business", "Microsoft 365 Basic")
    ]
    if specific:
        return specific[0]
    if "Microsoft 365" in unique:
        return "Microsoft 365"

    def year_of(label):
        return next((int(y) for y in KNOWN_OFFICE_YEARS if y in label), 0)

    return max(unique, key=year_of)


def resolve_device_uids(site_uid, hostnames, logger=print):
    """{device_uid: HOSTNAME} for the hostnames found in Datto.

    The agency's own site is searched first; any hostname still unmatched is
    looked for across the whole account, which handles agents registered under
    a different site than the agency they belong to.
    """
    client = datto()
    targets = {h.strip().upper() for h in hostnames if h}
    uid_to_hostname = {}

    for device in client.site_devices(site_uid, logger=logger):
        host = (device.get("hostname") or "").strip().upper()
        if host in targets and device.get("uid"):
            uid_to_hostname[device["uid"]] = host
    matched = set(uid_to_hostname.values())
    logger(f"[INFO] Matched {len(matched)}/{len(targets)} hostnames in site")

    leftover = targets - matched
    if leftover:
        logger(f"[INFO] Searching all account devices for {len(leftover)} unmatched hostnames")
        for device in client.account_devices(logger=logger):
            host = (device.get("hostname") or "").strip().upper()
            if host in leftover and device.get("uid"):
                uid_to_hostname[device["uid"]] = host
                leftover.discard(host)
        logger(f"[INFO] Total matched after account-wide search: {len(uid_to_hostname)}")

    return uid_to_hostname


def office_labels_for(uid, hostname=None, logger=None):
    """Office product labels installed on a device; [] when unknown.

    A failed audit and a device with no Office both come back empty, and both
    render as a blank column, so failures are logged loudly.
    """
    tag = f"[{hostname or uid}]"
    software = datto().device_software(uid, logger=logger, tag=tag)
    if software is None:
        if logger:
            logger(f"[WARN] {tag} software audit unavailable; Office left blank")
        return []
    labels = list(
        dict.fromkeys(filter(None, (classify_office(s.get("name", "")) for s in software)))
    )
    if not labels and software and logger:
        logger(f"[WARN] {tag} no Office product in {len(software)} audited entries")
    return labels


def hardware_for(uid, hostname=None, logger=None):
    """(memory_gb, c_drive_gb) from the hardware audit; '' for anything unavailable."""
    tag = f"[{hostname or uid}]"
    audit = datto().device_audit(uid, logger=logger, tag=tag)
    if audit is None:
        if logger:
            logger(f"[WARN] {tag} hardware audit unavailable")
        return "", ""

    total_memory = 0
    for module in audit.get("physicalMemory") or []:
        try:
            total_memory += int(module.get("size") or 0)
        except (TypeError, ValueError):
            pass
    memory_gb = round(total_memory / (1024**3)) if total_memory else ""

    c_drive_bytes = 0
    for disk in audit.get("logicalDisks") or []:
        if (disk.get("diskIdentifier") or "").strip().upper().rstrip(":") == "C":
            try:
                c_drive_bytes = int(disk.get("size") or 0)
            except (TypeError, ValueError):
                c_drive_bytes = 0
            break
    storage_gb = round_storage_gb(c_drive_bytes / 1_000_000_000) if c_drive_bytes else ""
    return memory_gb, storage_gb


def enrich_devices(site_uid, hostnames, logger=print, progress_phase=None):
    """{HOSTNAME: {office_version, memory_gb, storage_gb}} for every hostname.

    Hostnames with no Datto match get empty values. `progress_phase` is
    (phases, name) to report per-device progress through.
    """
    if not site_uid or not hostnames:
        return {}
    client = datto()
    uid_to_hostname = resolve_device_uids(site_uid, hostnames, logger=logger)

    def audit(uid):
        host = uid_to_hostname[uid]
        labels = office_labels_for(uid, hostname=host, logger=logger)
        memory_gb, storage_gb = hardware_for(uid, hostname=host, logger=logger)
        return host, {
            "office_version": ", ".join(labels),
            "memory_gb": memory_gb,
            "storage_gb": storage_gb,
        }

    result = {}
    total = len(uid_to_hostname)
    with concurrent.futures.ThreadPoolExecutor(max_workers=client.max_workers) as pool:
        for host, info in pool.map(audit, list(uid_to_hostname)):
            result[host] = info
            if progress_phase:
                phases, name = progress_phase
                phases.start(name, done=len(result), total=total)

    for host in {h.strip().upper() for h in hostnames if h}:
        result.setdefault(host, {"office_version": "", "memory_gb": "", "storage_gb": ""})

    found = sum(1 for v in result.values() if v["office_version"])
    logger(f"[INFO] Enrichment: Office on {found} of {len(result)} devices")
    return result


def primary_office_by_device(site_uid, hostnames, logger=print, phases=None, phase_name=None):
    """{HOSTNAME: primary Office label} for devices with Office installed."""
    client = datto()
    uid_to_hostname = resolve_device_uids(site_uid, hostnames, logger=logger)
    uids = list(uid_to_hostname)
    found = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=client.max_workers) as pool:
        label_lists = pool.map(lambda u: office_labels_for(u, uid_to_hostname[u], logger), uids)
        for i, (uid, labels) in enumerate(zip(uids, label_lists, strict=True), start=1):
            if phases:
                phases.start(phase_name, done=i, total=len(uids))
            primary = primary_office_label(labels)
            if primary:
                found[uid_to_hostname[uid]] = primary
    return found
