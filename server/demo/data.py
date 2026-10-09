"""Row generators for every snapshot table, keyed by report type.

Each generator is seeded from its scope, so the same agency always gets the
same devices and the same month always gets the same tickets, across restarts
and across the sync. Sizes are scaled so the whole demo estate comes to about
1,700 devices across 25 agencies, which is what the real deployment manages.
"""

import json
import random
import time
from datetime import UTC, date, datetime, timedelta

from core import progress

# Roughly a second per simulated report, spread over its phases, so a refresh
# is visibly "working" without making anyone wait.
STEP_DELAY_SECONDS = 0.12

_AGENCY_NAMES = [
    "Harbor Point Health",
    "Northfield Community Schools",
    "Cedar Ridge Family Services",
    "Lakeside Behavioral Care",
    "Summit Valley Housing",
    "Pinecrest Youth Programs",
    "Riverbend Senior Living",
    "Oakmont Legal Aid",
    "Bluewater Public Library",
    "Maple Grove Township",
    "Stonebridge Credit Union",
    "Westfield Animal Shelter",
    "Ironwood Manufacturing",
    "Clearview Dental Group",
    "Silver Lake Arts Center",
    "Granite Hills Medical",
    "Fairhaven Food Bank",
    "Brookside Veterinary",
    "Copper Creek Logistics",
    "Willow Park Daycare",
    "Highland Transit Authority",
    "Meadowbrook Insurance",
    "Redwood Counseling",
    "Eastgate Physical Therapy",
    "Sunridge Hospice",
]

_FIRST_NAMES = [
    "Avery",
    "Jordan",
    "Casey",
    "Riley",
    "Morgan",
    "Taylor",
    "Quinn",
    "Reese",
    "Drew",
    "Sage",
    "Blake",
    "Emerson",
    "Finley",
    "Harper",
    "Kendall",
    "Logan",
    "Parker",
    "Rowan",
    "Skyler",
    "Tatum",
]
_LAST_NAMES = [
    "Alvarez",
    "Bennett",
    "Carver",
    "Dalton",
    "Ellison",
    "Foster",
    "Gallagher",
    "Holt",
    "Ingram",
    "Jennings",
    "Keller",
    "Lambert",
    "Mercer",
    "Nakamura",
    "Osborne",
    "Pruitt",
    "Quigley",
    "Ramsey",
    "Sutton",
    "Thornton",
    "Underwood",
    "Vasquez",
    "Whitaker",
    "Yates",
]

_STAFF = [
    ("Alvarez, Nina", "Level 2 - Help Desk"),
    ("Bennett, Omar", "Level 2 - Help Desk"),
    ("Carver, Lena", "Level 1 - Call Center"),
    ("Dalton, Priya", "Level 1 - Call Center"),
    ("Ellison, Marcus", "Level 3 - Jr Sys Admin"),
    ("Foster, Ivy", "Level 3 - Jr Sys Admin"),
    ("Gallagher, Theo", "Level 4 - Sr Sys Admin"),
    ("Holt, Simone", "Level 4 - Sr Sys Admin"),
    ("Ingram, Dev", "Level 5 - Specialist"),
    ("Jennings, Cora", "Level 0 - Administration"),
]

_DEPARTMENTS = ["Finance", "Operations", "Clinical", "Front Desk", "Administration", "IT", "HR"]
_LOCATIONS = ["Main Office", "North Campus", "Annex", "Warehouse", "Remote"]
_MANUFACTURERS = {
    "Dell Inc.": ["OptiPlex 7010", "Latitude 5540", "Latitude 7440", "OptiPlex 5090"],
    "LENOVO": ["ThinkPad T14 Gen 4", "ThinkCentre M70q", "ThinkPad L15"],
    "HP": ["EliteBook 840 G9", "ProDesk 400 G7", "EliteDesk 800 G6"],
}
_PROCESSORS = [
    "12th Gen Intel(R) Core(TM) i5-12500",
    "13th Gen Intel(R) Core(TM) i7-1365U",
    "AMD Ryzen 5 PRO 7540U",
    "11th Gen Intel(R) Core(TM) i5-1145G7",
]
_OS_VERSIONS = [
    ("Microsoft Windows 11 Pro", 0.72),
    ("Microsoft Windows 10 Pro", 0.26),
    ("Microsoft Windows 11 Enterprise", 0.02),
]
_OFFICE_VERSIONS = [
    ("Microsoft 365 Business", 0.55),
    ("Microsoft 365 Enterprise", 0.25),
    ("Office Standard 2021", 0.1),
    ("Office LTSC Standard 2024", 0.05),
    ("", 0.05),
]
_PATCH_STATUSES = [
    ("FullyPatched", "Fully Patched", 0.7),
    ("ApprovedPending", "Approved Pending", 0.14),
    ("RebootRequired", "Reboot Required", 0.08),
    ("InstallError", "Install Error", 0.04),
    ("NoData", "No Data", 0.03),
    ("NoPolicy", "No Policy", 0.01),
]

# Picklist ids follow the tenant mappings in report_rules so aggregate() labels them.
_TICKET_SOURCES = [(2, 0.4), (4, 0.3), (8, 0.15), (18, 0.05), (6, 0.05), (17, 0.05)]
_TICKET_PRIORITIES = [(2, 0.55), (3, 0.25), (1, 0.12), (4, 0.03), (6, 0.05)]
_TICKET_ISSUE_TYPES = [
    (33, 0.2),
    (25, 0.15),
    (48, 0.15),
    (39, 0.1),
    (34, 0.08),
    (43, 0.12),
    (11, 0.1),
    (7, 0.1),
]
_PASSWORD_SUB_ISSUES = [250, 296, 302, 323, 353, 370, 417, 428, 246]
_PRIORITY_LABELS = {
    1: "P2 Important",
    2: "P3 Moderate",
    3: "P4 Minor",
    4: "P1 Critical",
    6: "No Metrics",
}
_QUEUES = ["Help Desk", "Escalations", "Projects", "Monitoring"]
_SLA_NAMES = ["Standard Support", "Premium Support"]
_ISSUE_LABELS = {
    33: ("Password Reset", "Account Unlock"),
    25: ("Email Issue", "Mailbox"),
    48: ("Workstation", "Hardware"),
    39: ("Software", "Install"),
    34: ("Printer/Scanner/Copier", "Print Queue"),
    43: ("User Requests", "New User"),
    11: ("Network Admin", "Wi-Fi"),
    7: ("Server", "File Share"),
}

# 25 agencies; "site" is a fake Datto site UID, "id" a fake Autotask company id.
DEMO_AGENCIES = [
    {"id": 1000 + i, "site": f"{i + 1:08x}-0000-4000-8000-{i + 1:012x}", "name": name}
    for i, name in enumerate(_AGENCY_NAMES)
]
_AGENCY_BY_ID = {a["id"]: a for a in DEMO_AGENCIES}
_AGENCY_BY_SITE = {a["site"]: a for a in DEMO_AGENCIES}


def _pick(rng, weighted):
    """Choose from [(value, weight), ...]."""
    values, weights = zip(*weighted, strict=True)
    return rng.choices(values, weights=weights, k=1)[0]


def _person(rng):
    return f"{rng.choice(_FIRST_NAMES)} {rng.choice(_LAST_NAMES)}"


def _username(name):
    first, last = name.split(" ", 1)
    return f"{first[0]}{last}".lower()


def _prefix(agency_name):
    return "".join(w[0] for w in agency_name.split()[:3]).upper()


def _device_count(agency_id):
    # Sizes spread between 15 and 121 so the estate totals about 1,700.
    return 15 + (agency_id * 37) % 107


def _pace(logger, phases, name, done=None, total=None):
    phases.start(name, done=done, total=total)
    time.sleep(STEP_DELAY_SECONDS)


def _now():
    return datetime.now(UTC)


# ── devices ───────────────────────────────────────────────────────────────────


def _device_records(agency):
    """The stable device list for an agency, shared by every report that needs it."""
    rng = random.Random(f"devices:{agency['id']}")
    prefix = _prefix(agency["name"])
    records = []
    for n in range(_device_count(agency["id"])):
        manufacturer = rng.choice(list(_MANUFACTURERS))
        model = rng.choice(_MANUFACTURERS[manufacturer])
        is_laptop = "Latitude" in model or "ThinkPad" in model or "EliteBook" in model
        owner = _person(rng)
        records.append(
            {
                "hostname": f"{prefix}-{'LT' if is_laptop else 'DT'}-{n + 1:04d}",
                "serial": f"{prefix[:2]}{rng.randrange(10**9):09d}",
                "type": "Laptop" if is_laptop else "Desktop",
                "manufacturer": manufacturer,
                "model": model,
                "processor": rng.choice(_PROCESSORS),
                "memory_gb": rng.choice([8, 16, 16, 32]),
                "storage_gb": rng.choice([256, 512, 512, 1000]),
                "operating_system": _pick(rng, _OS_VERSIONS),
                "office_version": _pick(rng, _OFFICE_VERSIONS),
                "owner": owner,
                "department": rng.choice(_DEPARTMENTS),
                "location": rng.choice(_LOCATIONS),
                "purchase_date": date(
                    2019 + rng.randrange(6), 1 + rng.randrange(12), 1 + rng.randrange(28)
                ),
                "last_seen_days_ago": rng.choice([0, 0, 0, 1, 2, 7, 30]),
                "patch_status": _pick(rng, [(s, w) for s, _, w in _PATCH_STATUSES]),
            }
        )
    return records


def devices(company_id, site_id, logger):
    agency = _AGENCY_BY_ID[company_id]
    from services.devices import DEVICE_PHASES

    phases = progress.Phases(logger, DEVICE_PHASES)
    records = _device_records(agency)
    logger(f"[INFO] Collecting devices for {agency['name']}")
    _pace(logger, phases, DEVICE_PHASES[0], done=len(records))
    _pace(logger, phases, DEVICE_PHASES[1], done=len(records), total=len(records))
    for i in range(0, len(records), 40):
        phases.start(DEVICE_PHASES[2], done=min(i + 40, len(records)), total=len(records))
        time.sleep(STEP_DELAY_SECONDS / 2)
    _pace(logger, phases, DEVICE_PHASES[3], done=1, total=1)

    rows = []
    for n, r in enumerate(records):
        last_seen = _now() - timedelta(days=r["last_seen_days_ago"], hours=3)
        rows.append(
            {
                "autotask_id": 50000 + (company_id - 1000) * 1000 + n,
                "type": r["type"],
                "name": r["hostname"],
                "serial": r["serial"],
                "ip": f"10.{(company_id % 200) + 10}.{int(r['hostname'][-4:]) // 250}.{int(r['hostname'][-4:]) % 250 + 1}",
                "primary_user_or_role": r["owner"] if r["type"] == "Laptop" else r["department"],
                "purchase_date": r["purchase_date"].strftime("%m/%d/%Y"),
                "department": r["department"],
                "location": r["location"],
                "last_user": _username(r["owner"]),
                "last_seen": last_seen.strftime("%m/%d/%Y %I:%M:%S %p"),
                "manufacturer": r["manufacturer"],
                "model": r["model"],
                "processor": r["processor"],
                "memory_gb": r["memory_gb"],
                "storage_gb": r["storage_gb"],
                "operating_system": r["operating_system"],
                "office_version": r["office_version"],
                "antivirus_status": "Protected",
                "patch_status": dict((s, label) for s, label, _ in _PATCH_STATUSES)[
                    r["patch_status"]
                ],
            }
        )
    logger(f"[DONE] {len(rows)} devices for {agency['name']}")
    return rows


# ── office / windows ──────────────────────────────────────────────────────────


def office_windows(company_id, site_id, logger):
    agency = _AGENCY_BY_ID[company_id]
    from services.office_windows import OW_PHASES

    phases = progress.Phases(logger, OW_PHASES)
    records = _device_records(agency)
    _pace(logger, phases, OW_PHASES[0], done=len(records))
    for i in range(0, len(records), 40):
        phases.start(OW_PHASES[1], done=min(i + 40, len(records)), total=len(records))
        time.sleep(STEP_DELAY_SECONDS / 2)
    _pace(logger, phases, OW_PHASES[2], done=1, total=1)

    os_devices = {"Windows 10": [], "Windows 11": []}
    office_devices = {}
    for r in records:
        key = "Windows 11" if "Windows 11" in r["operating_system"] else "Windows 10"
        os_devices[key].append(r["hostname"])
        if r["office_version"]:
            office_devices.setdefault(r["office_version"], []).append(r["hostname"])

    rows = [
        {"kind": "os", "product": name, "installs": len(hosts), "devices_json": json.dumps(hosts)}
        for name, hosts in os_devices.items()
    ]
    rows += [
        {
            "kind": "office",
            "product": name,
            "installs": len(hosts),
            "devices_json": json.dumps(hosts),
        }
        for name, hosts in sorted(office_devices.items())
    ]
    logger(f"[DONE] Office/Windows counts for {agency['name']}")
    return rows


# ── patch management ──────────────────────────────────────────────────────────


def patch(site_id, logger):
    agency = _AGENCY_BY_SITE[site_id]
    from services.patch_management import PATCH_PHASES

    phases = progress.Phases(logger, PATCH_PHASES)
    records = _device_records(agency)
    rng = random.Random(f"patch:{site_id}")
    _pace(logger, phases, PATCH_PHASES[0], done=len(records))
    _pace(logger, phases, PATCH_PHASES[1], done=1, total=1)

    labels = {s: label for s, label, _ in _PATCH_STATUSES}
    rows = []
    for r in records:
        installed = rng.randrange(40, 140)
        pending = 0 if r["patch_status"] == "FullyPatched" else rng.randrange(1, 9)
        rows.append(
            {
                "hostname": r["hostname"],
                "description": f"{r['manufacturer']} {r['model']}",
                "last_user": _username(r["owner"]),
                "last_reboot": (_now() - timedelta(days=rng.randrange(0, 21))).isoformat(),
                "installed": installed,
                "approved_pending": pending,
                "not_approved": rng.randrange(0, 4),
                "status": r["patch_status"],
                "status_label": labels[r["patch_status"]],
            }
        )
    rows.sort(key=lambda row: row["hostname"])
    logger(f"[DONE] Patch status for {len(rows)} workstations")
    return rows


# ── hdd tickets ───────────────────────────────────────────────────────────────


def hdd(company_id, logger):
    agency = _AGENCY_BY_ID[company_id]
    from services.hdd_tickets import HDD_PHASES

    phases = progress.Phases(logger, HDD_PHASES)
    rng = random.Random(f"hdd:{company_id}")
    records = _device_records(agency)
    offenders = [r for r in records if rng.random() < 0.06]
    _pace(logger, phases, HDD_PHASES[0], done=len(offenders) * 3)
    _pace(logger, phases, HDD_PHASES[1], done=len(offenders), total=len(offenders))
    _pace(logger, phases, HDD_PHASES[2], done=1, total=1)
    rows = [
        {
            "device_name": r["hostname"],
            "ticket_count": rng.randrange(1, 9),
            "last_user": _username(r["owner"]),
            "c_drive_gb": float(min(r["storage_gb"], 256)),
        }
        for r in offenders
    ]
    logger(f"[DONE] {len(rows)} devices with disk-space tickets")
    return rows


# ── tickets ───────────────────────────────────────────────────────────────────


def _month_days(year, month):
    start = date(year, month, 1)
    end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    return start, (end - start).days


def tickets(company_id, year, month, logger):
    agency = _AGENCY_BY_ID[company_id]
    rng = random.Random(f"tickets:{company_id}:{year}:{month}")
    start, days = _month_days(year, month)
    count = max(5, _device_count(company_id) // 3 + rng.randrange(-5, 10))
    logger(f"[INFO] Collecting {count} tickets for {agency['name']}, {year}-{month:02d}")
    time.sleep(STEP_DELAY_SECONDS * 2)

    rows = []
    for n in range(count):
        created = datetime(start.year, start.month, 1, tzinfo=UTC) + timedelta(
            days=rng.randrange(days), hours=rng.randrange(7, 18), minutes=rng.randrange(60)
        )
        complete = rng.random() < 0.92
        hours_open = rng.choice([0.5, 1, 2, 4, 8, 24, 48, 96])
        source = _pick(rng, _TICKET_SOURCES)
        creator = rng.randrange(1, 11)
        same_day_phone = source == 2 and rng.random() < 0.6
        issue = _pick(rng, _TICKET_ISSUE_TYPES)
        rows.append(
            {
                "ticket_id": year * 100000 + month * 1000 + company_id % 100 * 10 + n,
                "source": source,
                "priority": _pick(rng, _TICKET_PRIORITIES),
                "issue_type": issue,
                "sub_issue_type": rng.choice(_PASSWORD_SUB_ISSUES) if issue == 33 else None,
                "status": 5 if complete else 1,
                "create_date": created.isoformat().replace("+00:00", "Z"),
                "completed_date": (
                    (created + timedelta(hours=0.5 if same_day_phone else hours_open))
                    .isoformat()
                    .replace("+00:00", "Z")
                    if complete
                    else None
                ),
                "creator_resource_id": creator,
                "completed_by_resource_id": creator if same_day_phone else rng.randrange(1, 11),
            }
        )
    logger(f"[DONE] {len(rows)} tickets")
    return rows


# ── sla ───────────────────────────────────────────────────────────────────────


def sla(year, month, logger):
    from services.sla import SLA_PHASES

    phases = progress.Phases(logger, SLA_PHASES)
    rng = random.Random(f"sla:{year}:{month}")
    start, days = _month_days(year, month)
    rows = []
    total = sum(max(3, _device_count(a["id"]) // 6) for a in DEMO_AGENCIES)
    _pace(logger, phases, SLA_PHASES[0], done=total)
    _pace(logger, phases, SLA_PHASES[1])
    for agency in DEMO_AGENCIES:
        for n in range(max(3, _device_count(agency["id"]) // 6)):
            created = datetime(start.year, start.month, 1, 9, tzinfo=UTC) + timedelta(
                days=rng.randrange(days), hours=rng.randrange(8)
            )
            priority_id = _pick(rng, [(1, 0.15), (2, 0.55), (3, 0.25), (4, 0.05)])
            first_response_h = rng.choice([0.25, 0.5, 1, 2, 4, 9])
            resolved_h = rng.choice([1, 2, 4, 9, 18, 45, 90])
            fr_met = first_response_h <= {4: 1, 1: 4, 2: 9, 3: 27}[priority_id]
            res_met = resolved_h <= {4: 9, 1: 18, 2: 45, 3: 90}[priority_id]
            resource = rng.choice(_STAFF)[0]
            issue_label, sub_label = _ISSUE_LABELS[_pick(rng, _TICKET_ISSUE_TYPES)]
            complete = created + timedelta(hours=resolved_h)
            ticket_number = f"T{year}{month:02d}{agency['id'] % 100:02d}{n:03d}"
            processed = {
                "ticketNumber": ticket_number,
                "title": f"{issue_label}: {sub_label.lower()} for {_person(rng)}",
                "companyName": agency["name"],
                "createDate": created.strftime("%m/%d/%Y"),
                "slaStartDate": created.strftime("%m/%d/%Y"),
                "completeDate": complete.strftime("%m/%d/%Y"),
                "resource": resource,
                "queue": rng.choice(_QUEUES),
                "status": "Complete",
                "priority": _PRIORITY_LABELS[priority_id],
                "ticketType": "Service Request",
                "ticketCategory": "Standard",
                "issueType": issue_label,
                "subIssueType": sub_label,
                "firstResponseHours": first_response_h,
                "firstResponseMet": fr_met,
                "resolutionPlanHours": min(first_response_h * 2, resolved_h),
                "resolutionPlanMet": fr_met,
                "resolvedHours": resolved_h,
                "resolvedMet": res_met,
                "waitingCustomerHours": rng.choice([0, 0, 0.5, 2]),
                "_resourceId": None,
                "_companyId": agency["id"],
                "_slaId": 1,
                "_priorityId": priority_id,
            }
            rows.append(
                {
                    "ticket_id": int(ticket_number[1:]),
                    "company_id": agency["id"],
                    "company_name": agency["name"],
                    "sla_name": rng.choice(_SLA_NAMES),
                    "priority_id": priority_id,
                    "resource": resource,
                    "first_response_met": int(fr_met),
                    "resolved_met": int(res_met),
                    "data_json": json.dumps(processed),
                }
            )
    _pace(logger, phases, SLA_PHASES[2], done=1, total=1)
    logger(f"[DONE] {len(rows)} SLA tickets across {len(DEMO_AGENCIES)} companies")
    return rows


# ── utilization ───────────────────────────────────────────────────────────────


def utilization(start, end, logger):
    """Returns (rows, entries) like services.utilization.fetch_rows(with_entries=True)."""
    from report_rules import ROLE_TO_TIER
    from services.utilization import PHASES, parse_date

    phases = progress.Phases(logger, PHASES)
    start_d, end_d = parse_date(start), parse_date(end)
    rng = random.Random(f"util:{start_d}:{end_d}")
    days = (end_d - start_d).days + 1
    workdays = [
        start_d + timedelta(days=i)
        for i in range(days)
        if (start_d + timedelta(days=i)).weekday() < 5
    ]

    entries = []
    logger(f"[INFO] Utilization {start_d} to {end_d}: {len(workdays)} working days")
    _pace(logger, phases, PHASES[0], done=0)
    for day_index, day in enumerate(workdays):
        for name, role in _STAFF:
            for _ in range(rng.randrange(2, 6)):
                agency = rng.choice(DEMO_AGENCIES) if rng.random() < 0.93 else None
                entries.append(
                    {
                        "date": day.isoformat(),
                        "company": agency["name"] if agency else "Internal",
                        "ticket": f"T{day:%Y%m%d}{rng.randrange(100, 999)}" if agency else "",
                        "title": rng.choice(
                            [
                                "Password reset",
                                "Printer offline",
                                "New hire setup",
                                "Server patching",
                                "Backup review",
                                "Wi-Fi coverage",
                            ]
                        )
                        if agency
                        else "Internal: team meeting",
                        "resource": name,
                        "hours": rng.choice([0.25, 0.5, 0.75, 1, 1.5, 2, 3]),
                        "role": role,
                    }
                )
        if day_index % 10 == 0:
            logger(f"[INFO] Collected {len(entries)} time entries so far")
            phases.start(PHASES[0], done=len(entries))
            time.sleep(STEP_DELAY_SECONDS)
    logger(f"[INFO] Total time entries: {len(entries)}")
    logger(f"[INFO] Loaded {len(_STAFF)} staff and {len(set(r for _, r in _STAFF))} roles")
    _pace(logger, phases, PHASES[1])
    logger(f"[INFO] Resolving {len(DEMO_AGENCIES)} companies")
    _pace(logger, phases, PHASES[2], done=len(entries), total=len(entries))

    totals = {}
    for e in entries:
        tier = ROLE_TO_TIER.get(e["role"])
        if not tier:
            continue
        key = (tier, e["resource"], e["company"])
        totals[key] = totals.get(key, 0.0) + e["hours"]
    rows = [
        {"category": tier, "worker": worker, "company": company, "hours": round(hours, 2)}
        for (tier, worker, company), hours in totals.items()
    ]
    entries.sort(key=lambda r: (r["date"], r["company"], r["resource"]))
    _pace(logger, phases, PHASES[3], done=1, total=1)
    logger(f"[DONE] {len(rows)} util rows, {len(entries)} raw entries")
    return rows, entries


# ── dispatch ──────────────────────────────────────────────────────────────────


def fetch_for(report_type, scope, logger):
    """Return demo rows for a snapshot scope, as the real service fetch would."""
    if report_type == "devices":
        return devices(scope["company_id"], scope["site_id"], logger)
    if report_type == "office_windows":
        return office_windows(scope["company_id"], scope["site_id"], logger)
    if report_type == "patch":
        return patch(scope["site_id"], logger)
    if report_type == "hdd":
        return hdd(scope["company_id"], logger)
    if report_type == "tickets":
        return tickets(scope["company_id"], scope["year"], scope["month"], logger)
    if report_type == "sla":
        return sla(scope["year"], scope["month"], logger)
    if report_type == "utilization":
        from repositories import sqlite

        rows, entries = utilization(scope["period_start"], scope["period_end"], logger)
        sqlite.replace_scope("util_entry_rows", scope, entries)
        return rows
    raise ValueError(f"no demo generator for report type {report_type!r}")
