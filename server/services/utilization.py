"""Utilization: hours worked per agency over a date range, by billing tier and worker.

Every time entry in the range is pulled once. An entry's agency comes from its
ticket, or failing that from its task's project; time with neither is the MSP's
own and is labelled INTERNAL_LABEL. Its tier is the role the entry was booked
under, mapped through ROLE_TO_TIER, so history stays put when someone changes
role; entries under a role outside that map are logged and left out of the
totals. The result is {tier -> worker -> agency -> hours}, stored flat, plus the
individual entries behind it for the raw export.
"""

from collections import defaultdict
from datetime import date, datetime, timedelta

from core import progress
from integrations.autotask import autotask
from report_rules import FISCAL_START_MONTH, INTERNAL_LABEL, ROLE_TO_TIER
from repositories import sqlite
from repositories.snapshots import Snapshot, get_cached_rows, read_rows

# In the order they run: staff are looked up before entries are matched to
# agencies, so numbering them any other way makes the bar jump back.
PHASES = [
    "Collecting time entries",
    "Looking up staff and roles",
    "Matching entries to agencies",
    "Building the report",
]

# The query a step runs -> the phase a person recognises it as.
_LABEL_PHASES = {
    "time entries": PHASES[0],
    "resources": PHASES[1],
    "roles": PHASES[1],
    "tickets": PHASES[2],
    "tasks": PHASES[2],
    "projects": PHASES[2],
    "companies": PHASES[2],
}

TIME_ENTRY_FIELDS = [
    "id",
    "dateWorked",
    "hoursWorked",
    "resourceID",
    "ticketID",
    "taskID",
    "roleID",
]


def _report(logger, label, done=None, total=None):
    """Emit progress for the phase a query label belongs to."""
    phase = _LABEL_PHASES.get(label, label)
    if phase not in PHASES:
        return
    step = PHASES.index(phase) + 1
    progress.emit(logger, phase, done=done, total=total, step=step, steps=len(PHASES))


# ── Dates ────────────────────────────────────────────────────────────────────


def parse_date(value):
    """Accept a date or an ISO 'YYYY-MM-DD' string; reject anything else."""
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
    except ValueError as exc:
        raise ValueError(f"expected a YYYY-MM-DD date, got {value!r}") from exc


def period_label(start, end):
    """A human label for an inclusive range, naming the quarter or year it matches."""
    start, end = parse_date(start), parse_date(end)
    day_after_end = end + timedelta(days=1)

    if start.day == 1 and day_after_end.day == 1:
        months = (day_after_end.year - start.year) * 12 + (day_after_end.month - start.month)
        if months == 3 and start.month in (1, 4, 7, 10):
            return f"Q{(start.month - 1) // 3 + 1} {start.year}"
        if months == 12 and start.month == FISCAL_START_MONTH:
            return f"FY {start.year}-{str(start.year + 1)[-2:]}"
        if months == 12 and start.month == 1:
            return str(start.year)

    return f"{start:%d %b %Y} - {end:%d %b %Y}"


def current_fiscal_year(today=None):
    """The reporting year currently in progress, identified by its start year."""
    today = today or datetime.now()
    return today.year if today.month >= FISCAL_START_MONTH else today.year - 1


def fiscal_year_range(start_year):
    """(start, end) inclusive dates for the reporting year starting in start_year."""
    start = date(start_year, FISCAL_START_MONTH, 1)
    return start, date(start_year + 1, FISCAL_START_MONTH, 1) - timedelta(days=1)


def quarter_range(year, quarter):
    """(start, end) inclusive dates for a calendar quarter."""
    if quarter not in (1, 2, 3, 4):
        raise ValueError(f"quarter must be 1-4, got {quarter!r}")
    first_month = (quarter - 1) * 3 + 1
    start = date(year, first_month, 1)
    end = (
        date(year + 1, 1, 1) if first_month == 10 else date(year, first_month + 3, 1)
    ) - timedelta(days=1)
    return start, end


def _validated_range(start, end):
    start_date, end_date = parse_date(start), parse_date(end)
    if end_date < start_date:
        raise ValueError(f"end ({end_date}) is before start ({start_date})")
    return start_date, end_date


# ── Fetch pipeline ───────────────────────────────────────────────────────────


def collect_time_entries(start_date, end_date, logger):
    """Every time entry worked in the inclusive range."""
    # Autotask takes an exclusive upper bound, so the day after `end` keeps
    # entries logged on the final date.
    filters = [
        {"op": "gte", "field": "dateWorked", "value": f"{start_date:%Y-%m-%d}T00:00:00Z"},
        {
            "op": "lt",
            "field": "dateWorked",
            "value": f"{end_date + timedelta(days=1):%Y-%m-%dT00:00:00Z}",
        },
    ]
    logger("[INFO] Fetching time entries...")
    _report(logger, "time entries")
    entries = autotask().query_all(
        "TimeEntries",
        filters,
        TIME_ENTRY_FIELDS,
        on_page=lambda count: _report(logger, "time entries", done=count),
    )
    logger(f"[INFO] Total time entries: {len(entries)}")
    return entries


def load_staff(logger):
    """({resource id: 'Last, First'} for current and former staff, {role id: name})."""
    logger("[INFO] Fetching resources and roles...")
    _report(logger, "resources")
    client = autotask()
    names = {}
    for active in (True, False):
        resources = client.query_all(
            "Resources",
            [{"op": "eq", "field": "isActive", "value": active}],
            ["id", "firstName", "lastName"],
        )
        for r in resources:
            names[r["id"]] = f"{r.get('lastName', '')}, {r.get('firstName', '')}".strip(", ")
    roles = client.query_all("Roles", [], ["id", "name"])
    role_names = {r["id"]: r.get("name", "") for r in roles}
    logger(f"[INFO] Loaded {len(names)} resources and {len(role_names)} roles")
    return names, role_names


def resolve_ticket_companies(time_entries, logger):
    """{ticket id: ticket} for every ticket the entries are logged against."""
    ticket_ids = sorted({t["ticketID"] for t in time_entries if t.get("ticketID")})
    logger(f"[INFO] Resolving {len(ticket_ids)} unique tickets -> companies...")
    tickets = autotask().query_by_ids(
        "Tickets",
        ticket_ids,
        ["id", "companyID", "ticketNumber", "title"],
        on_chunk=lambda done, total: _report(logger, "tickets", done, total),
    )
    return {t["id"]: t for t in tickets}


def resolve_task_companies(time_entries, logger):
    """{task id: company id} via the task's project, for entries logged to a task, not a ticket."""
    task_ids = sorted(
        {t["taskID"] for t in time_entries if t.get("taskID") and not t.get("ticketID")}
    )
    if not task_ids:
        return {}
    client = autotask()
    logger(f"[INFO] Resolving {len(task_ids)} unique tasks -> projects...")
    tasks = client.query_by_ids(
        "Tasks",
        task_ids,
        ["id", "projectID"],
        on_chunk=lambda done, total: _report(logger, "tasks", done, total),
    )
    task_to_project = {t["id"]: t["projectID"] for t in tasks if t.get("projectID")}
    project_ids = sorted(set(task_to_project.values()))
    if not project_ids:
        return {}
    logger(f"[INFO] Resolving {len(project_ids)} unique projects -> companies...")
    projects = client.query_by_ids(
        "Projects",
        project_ids,
        ["id", "companyID"],
        on_chunk=lambda done, total: _report(logger, "projects", done, total),
    )
    # `is not None`, not truthiness: company 0 is a real company (the MSP's own
    # account), and treating it as missing loses every internal project.
    project_to_company = {
        p["id"]: p["companyID"] for p in projects if p.get("companyID") is not None
    }
    return {
        task_id: project_to_company[project_id]
        for task_id, project_id in task_to_project.items()
        if project_id in project_to_company
    }


def load_company_names(company_ids, logger):
    """{company id: name}; a company Autotask no longer returns keeps a placeholder name."""
    ids = sorted(company_ids)
    logger(f"[INFO] Resolving {len(ids)} unique companies...")
    companies = autotask().query_by_ids(
        "Companies",
        ids,
        ["id", "companyName"],
        on_chunk=lambda done, total: _report(logger, "companies", done, total),
    )
    return {c["id"]: c.get("companyName") or f"Company {c['id']}" for c in companies}


def _company_id(entry, tickets, task_companies):
    company_id = None
    if entry.get("ticketID"):
        company_id = (tickets.get(entry["ticketID"]) or {}).get("companyID")
    # Same `is not None` rule as above: company 0 is the MSP's own account.
    if company_id is None and entry.get("taskID"):
        company_id = task_companies.get(entry["taskID"])
    return company_id


def label_entry_companies(time_entries, tickets, task_companies, logger):
    """{time entry id: company name}, INTERNAL_LABEL where nothing leads to a company."""
    by_entry = {e["id"]: _company_id(e, tickets, task_companies) for e in time_entries}
    names = load_company_names({cid for cid in by_entry.values() if cid is not None}, logger)
    return {
        entry_id: INTERNAL_LABEL if cid is None else names.get(cid, f"Company {cid}")
        for entry_id, cid in by_entry.items()
    }


def aggregate_hours(time_entries, entry_company, staff_names, role_names, logger):
    """{tier: {worker: {company: hours}}}, from entries with hours, a known resource and a tiered role."""
    totals = defaultdict(lambda: defaultdict(lambda: defaultdict(float)))
    unmapped_roles = set()
    for entry in time_entries:
        hours = float(entry.get("hoursWorked") or 0)
        resource_id = entry.get("resourceID")
        if not hours or resource_id not in staff_names:
            continue
        role = role_names.get(entry.get("roleID"), "")
        tier = ROLE_TO_TIER.get(role)
        if not tier:
            unmapped_roles.add(role or "(no role)")
            continue
        worker = staff_names[resource_id] or f"Resource {resource_id}"
        totals[tier][worker][entry_company[entry["id"]]] += hours
    if unmapped_roles:
        logger("[INFO] Roles not mapped to a billing tier (left out of the totals):")
        for role in sorted(unmapped_roles):
            logger(f"[INFO]   {role}")
    return totals


def flatten_rows(totals):
    """One {category, worker, company, hours} row per (tier, worker, company)."""
    return [
        {"category": tier, "worker": worker, "company": company, "hours": round(hours, 2)}
        for tier, workers in totals.items()
        for worker, by_company in workers.items()
        for company, hours in by_company.items()
    ]


def build_entries(time_entries, staff_names, entry_company, tickets, role_names):
    """The individual entries behind the totals, sorted by date, company and worker.

    The aggregate answers "how many hours"; this answers "which hours", which is
    what anyone checking a figure actually needs.
    """
    rows = []
    for entry in time_entries:
        ticket = tickets.get(entry.get("ticketID")) or {}
        rows.append(
            {
                "date": str(entry.get("dateWorked") or "")[:10],
                "company": entry_company.get(entry.get("id"), INTERNAL_LABEL),
                "ticket": ticket.get("ticketNumber")
                or (entry.get("taskID") and f"Task {entry['taskID']}")
                or "",
                "title": ticket.get("title") or "",
                "resource": staff_names.get(entry.get("resourceID"), "Unknown"),
                # Full precision: rounding each entry before it is summed drifts
                # from the totals, which round once at the end.
                "hours": float(entry.get("hoursWorked") or 0),
                "role": role_names.get(entry.get("roleID"), ""),
            }
        )
    rows.sort(key=lambda r: (r["date"], r["company"], r["resource"]))
    return rows


def fetch_rows(start, end, logger=print, with_entries=False):
    """Flat {category, worker, company, hours} rows for an inclusive date range.

    With `with_entries`, returns (rows, entries): the entries behind the totals
    are resolved in the same pass so the two can never disagree.
    """
    start_date, end_date = _validated_range(start, end)
    logger(
        f"[INFO] Agency Utilization {period_label(start_date, end_date)} "
        f"({start_date} to {end_date})"
    )
    time_entries = collect_time_entries(start_date, end_date, logger)
    if not time_entries:
        return ([], []) if with_entries else []

    staff_names, role_names = load_staff(logger)
    tickets = resolve_ticket_companies(time_entries, logger)
    task_companies = resolve_task_companies(time_entries, logger)
    entry_company = label_entry_companies(time_entries, tickets, task_companies, logger)
    rows = flatten_rows(
        aggregate_hours(time_entries, entry_company, staff_names, role_names, logger)
    )
    _report(logger, PHASES[-1], done=1, total=1)
    if not with_entries:
        logger(f"[DONE] {len(rows)} util rows fetched")
        return rows

    entries = build_entries(time_entries, staff_names, entry_company, tickets, role_names)
    logger(f"[DONE] {len(rows)} util rows fetched, {len(entries)} raw entries")
    return rows, entries


# ── Aggregation ──────────────────────────────────────────────────────────────


def _sorted_categories(categories):
    return sorted(categories)


def _sorted_companies(companies):
    """Alphabetical, with the internal label last: it is not a customer."""
    ordered = sorted(c for c in companies if c != INTERNAL_LABEL)
    if INTERNAL_LABEL in companies:
        ordered.append(INTERNAL_LABEL)
    return ordered


def _rounded(totals):
    return {k: round(v, 2) for k, v in totals.items()}


def aggregate(rows, start, end):
    """The utilization payload: ordered tiers and companies, per-worker rows, and totals."""
    hours = defaultdict(lambda: defaultdict(dict))
    for r in rows:
        hours[r["category"]][r["worker"]][r["company"]] = r["hours"]

    out_rows = []
    category_totals = {}
    company_totals = defaultdict(float)
    for tier in _sorted_categories(hours):
        tier_totals = defaultdict(float)
        for worker in sorted(hours[tier]):
            by_company = _rounded(hours[tier][worker])
            for company, worked in by_company.items():
                tier_totals[company] += worked
                company_totals[company] += worked
            out_rows.append({"category": tier, "worker": worker, "byCompany": by_company})
        category_totals[tier] = _rounded(tier_totals)

    return {
        "categories": list(category_totals),
        "companies": _sorted_companies(company_totals),
        "rows": out_rows,
        "categoryTotals": category_totals,
        "companyTotals": _rounded(company_totals),
        "grandTotal": round(sum(company_totals.values()), 2),
        "start": str(parse_date(start)),
        "end": str(parse_date(end)),
        "periodLabel": period_label(start, end),
    }


# ── Cache ────────────────────────────────────────────────────────────────────


def snapshot(start, end):
    """The range itself is the cache key, so any two requests for the same dates share a snapshot."""
    start_date, end_date = _validated_range(start, end)
    scope = {"period_start": str(start_date), "period_end": str(end_date)}
    return Snapshot("utilization", "util_time_rows", scope)


def _entries_snapshot(start, end):
    return Snapshot("utilization", "util_entry_rows", snapshot(start, end).scope)


def stored_entries(start, end):
    """The time entries cached for a range, without their scope columns."""
    drop = {"period_start", "period_end", "synced_at"}
    rows = read_rows(_entries_snapshot(start, end))
    return [{k: v for k, v in row.items() if k not in drop} for row in rows]


def _cached_rows(start, end, logger, refresh):
    totals = snapshot(start, end)
    entries_table = _entries_snapshot(start, end)

    def fetch(log):
        # One fetch fills both tables: filling them separately would page a
        # year of time entries twice.
        rows, entries = fetch_rows(
            totals.scope["period_start"], totals.scope["period_end"], log, with_entries=True
        )
        sqlite.replace_scope(entries_table.table, entries_table.scope, entries)
        return rows

    return get_cached_rows(totals, fetch, refresh=refresh, logger=logger)


def get_utilization(start, end, logger=print, refresh=False):
    """Read-through cached utilization report for an inclusive date range."""
    rows, synced_at, cached = _cached_rows(start, end, logger, refresh)
    if cached:
        logger(f"[INFO] Utilization served from cache (synced_at={synced_at})")
    result = aggregate(rows, start, end)
    result["synced_at"] = synced_at
    return result


def get_entries(start, end, logger=print):
    """The individual time entries behind a report, for the raw export.

    Generating the report stores these, so this is a cache read. A period that
    has never been generated is fetched, which takes as long as the report.
    """
    stored = stored_entries(start, end)
    if not stored:
        logger("[INFO] No stored entries for this period; fetching...")
        refresh_snapshot(start, end, logger)
        stored = stored_entries(start, end)
    return stored


def refresh_snapshot(start, end, logger=print):
    """Refetch a range's totals and the entries behind them; sync uses this."""
    return _cached_rows(start, end, logger, refresh=True)
