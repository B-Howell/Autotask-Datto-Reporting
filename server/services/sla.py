"""Monthly SLA performance across every agency.

Autotask's SLA engine stamps each ticket with its first-response, resolution-
plan and resolved due times, so "met" is a comparison of actual against due
rather than a recomputation of the contract. Elapsed hours are counted in
business hours from ticket creation. One row per ticket is cached, with the
full processed ticket riding along as data_json so aggregate() can rebuild
the report without touching Autotask.
"""

import json
from collections import defaultdict
from datetime import timedelta

from config import settings
from core.progress import Phases
from integrations.autotask import autotask
from report_rules import (
    BUSINESS_HOURS,
    SLA_NO_METRICS_PRIORITY,
    SLA_TARGETS,
    TICKET_PRIORITY_LABELS,
)
from repositories.snapshots import Snapshot, get_cached_rows
from services.common import autotask_timestamp, month_bounds, parse_autotask_datetime

SLA_PHASES = ["Collecting tickets", "Looking up staff", "Building the report"]

TICKET_FIELDS = [
    "id",
    "ticketNumber",
    "title",
    "createDate",
    "completedDate",
    "assignedResourceID",
    "queueID",
    "status",
    "priority",
    "ticketType",
    "ticketCategory",
    "issueType",
    "subIssueType",
    "companyID",
    "serviceLevelAgreementID",
    "firstResponseDateTime",
    "firstResponseDueDateTime",
    "resolutionPlanDateTime",
    "resolutionPlanDueDateTime",
    "resolvedDateTime",
    "resolvedDueDateTime",
    "serviceLevelAgreementPausedNextEventHours",
]

# Processed-ticket key -> Tickets picklist field it is the label of.
_LABEL_FIELDS = {
    "queue": "queueID",
    "status": "status",
    "priority": "priority",
    "ticketType": "ticketType",
    "ticketCategory": "ticketCategory",
    "issueType": "issueType",
    "subIssueType": "subIssueType",
}

# Parsed-date key -> Tickets datetime field.
_DATE_FIELDS = {
    "create": "createDate",
    "complete": "completedDate",
    "first_response": "firstResponseDateTime",
    "first_response_due": "firstResponseDueDateTime",
    "resolution_plan": "resolutionPlanDateTime",
    "resolution_plan_due": "resolutionPlanDueDateTime",
    "resolved": "resolvedDateTime",
    "resolved_due": "resolvedDueDateTime",
}


def snapshot(year, month):
    return Snapshot("sla", "sla_ticket_rows", {"year": year, "month": month})


def _label(field, value):
    """Picklist label for a Tickets field value: '' for None, the raw value when unknown."""
    if value is None:
        return ""
    return autotask().picklist("Tickets", field).get(int(value), str(value))


def business_hours_between(start, end):
    """Business hours (Mon-Fri, within BUSINESS_HOURS) between two datetimes."""
    if not start or not end or end <= start:
        return 0.0
    open_hour, close_hour = BUSINESS_HOURS
    total_seconds = 0
    current = start
    while current < end:
        day_start = current.replace(hour=open_hour, minute=0, second=0, microsecond=0)
        if current.weekday() >= 5:
            current = day_start + timedelta(days=7 - current.weekday())
            continue
        day_end = current.replace(hour=close_hour, minute=0, second=0, microsecond=0)
        overlap = min(end, day_end) - max(current, day_start)
        if overlap > timedelta(0):
            total_seconds += overlap.total_seconds()
        current = day_start + timedelta(days=1)
    return round(total_seconds / 3600, 2)


def _ticket_dates(ticket):
    return {key: parse_autotask_datetime(ticket.get(field)) for key, field in _DATE_FIELDS.items()}


def _hours_to(start, event):
    return business_hours_between(start, event) if event else 0


def _met(priority_id, actual, due):
    """Whether an SLA event beat its due time; None when it cannot be judged."""
    if priority_id == SLA_NO_METRICS_PRIORITY or not actual or not due:
        return None
    return actual <= due


def _format_date(dt):
    return dt.strftime("%m/%d/%Y") if dt else ""


def _sla_metrics(dates, priority_id, waiting_hours):
    # The SLA clock starts at ticket creation.
    start = dates["create"]
    return {
        "firstResponseHours": _hours_to(start, dates["first_response"]),
        "firstResponseMet": _met(priority_id, dates["first_response"], dates["first_response_due"]),
        "resolutionPlanHours": _hours_to(start, dates["resolution_plan"]),
        "resolutionPlanMet": _met(
            priority_id, dates["resolution_plan"], dates["resolution_plan_due"]
        ),
        "resolvedHours": _hours_to(start, dates["resolved"]),
        "resolvedMet": _met(priority_id, dates["resolved"], dates["resolved_due"]),
        "waitingCustomerHours": round(float(waiting_hours or 0), 2),
    }


def _process_ticket(ticket, resource_names):
    """The full processed ticket that is stored as data_json."""
    dates = _ticket_dates(ticket)
    priority_id = ticket.get("priority")
    resource_id = ticket.get("assignedResourceID")
    return {
        "ticketNumber": ticket.get("ticketNumber", ""),
        "title": ticket.get("title", ""),
        "createDate": _format_date(dates["create"]),
        "slaStartDate": _format_date(dates["create"]),
        "completeDate": _format_date(dates["complete"]),
        "resource": resource_names.get(resource_id, "") if resource_id else "",
        **{key: _label(field, ticket.get(field)) for key, field in _LABEL_FIELDS.items()},
        **_sla_metrics(dates, priority_id, ticket.get("serviceLevelAgreementPausedNextEventHours")),
        "_resourceId": resource_id,
        "_companyId": ticket.get("companyID"),
        "_slaId": ticket.get("serviceLevelAgreementID"),
        "_priorityId": priority_id,
    }


def _closed_tickets(start, end, logger, phases):
    """Tickets under an SLA that were completed in the month, No Metrics excluded."""
    logger("[INFO] Fetching tickets closed in target month...")
    phases.start("Collecting tickets")
    filters = [
        {"op": "gte", "field": "completedDate", "value": autotask_timestamp(start)},
        {"op": "lt", "field": "completedDate", "value": autotask_timestamp(end)},
        {"op": "gt", "field": "serviceLevelAgreementID", "value": 0},
        {"op": "noteq", "field": "priority", "value": SLA_NO_METRICS_PRIORITY},
    ]

    def on_page(count):
        logger(f"[INFO]   {count} tickets so far")
        phases.update(done=count)

    tickets = autotask().query_all("Tickets", filters, TICKET_FIELDS, on_page=on_page)
    logger(f"[INFO] Found {len(tickets)} tickets closed in month")
    return tickets


def _resource_names(logger, phases):
    """{resource id: 'Last, First'} for active and inactive staff alike.

    Inactive resources are included because a ticket closed this month may be
    assigned to someone who has since left.
    """
    logger("[INFO] Fetching resources for name resolution...")
    phases.start("Looking up staff")
    names = {}
    for active in (True, False):
        resources = autotask().query_all(
            "Resources",
            [{"op": "eq", "field": "isActive", "value": active}],
            ["id", "firstName", "lastName"],
        )
        names.update(
            {r["id"]: f"{r.get('lastName', '')}, {r.get('firstName', '')}" for r in resources}
        )
    logger(f"[INFO] Loaded {len(names)} resources (active + inactive)")
    return names


def _company_names(company_ids, logger):
    """{company id: name}, with a placeholder for any id Autotask no longer returns."""
    logger(f"[INFO] Fetching names for {len(company_ids)} companies...")
    found = {
        c["id"]: c.get("companyName")
        for c in autotask().query_by_ids("Companies", company_ids, ["id", "companyName"])
    }
    return {cid: found.get(cid) or f"Company {cid}" for cid in company_ids}


def _met_int(value):
    return None if value is None else int(bool(value))


def _row(ticket, resource_names, company_names):
    processed = _process_ticket(ticket, resource_names)
    company_id = ticket.get("companyID")
    processed["companyName"] = company_names.get(company_id, f"Company {company_id}")
    sla_id = processed["_slaId"]
    return {
        "ticket_id": ticket.get("id"),
        "company_id": company_id,
        "company_name": processed["companyName"],
        "sla_name": _label("serviceLevelAgreementID", sla_id) if sla_id else "No SLA",
        "priority_id": processed["_priorityId"],
        "resource": processed["resource"],
        "first_response_met": _met_int(processed["firstResponseMet"]),
        "resolved_met": _met_int(processed["resolvedMet"]),
        "data_json": json.dumps(processed),
    }


def fetch_rows(year, month, logger=print):
    """One snapshot row per SLA ticket completed in the month."""
    start, end = month_bounds(year, month)
    logger(f"[INFO] SLA Performance Report for {start:%B %Y}")
    phases = Phases(logger, SLA_PHASES)
    tickets = _closed_tickets(start, end, logger, phases)
    resource_names = _resource_names(logger, phases)
    phases.start("Building the report")
    company_ids = {t["companyID"] for t in tickets if t.get("companyID")}
    company_names = _company_names(company_ids, logger)
    rows = [_row(t, resource_names, company_names) for t in tickets]
    phases.done()
    logger(f"[INFO] Processed {len(rows)} tickets across {len(company_ids)} companies")
    return rows


def _load_tickets(rows):
    """(tickets, {company id: name}, {company: {sla: tickets}}) from stored rows."""
    tickets, companies = [], {}
    grouped = defaultdict(lambda: defaultdict(list))
    for row in rows:
        ticket = json.loads(row["data_json"])
        tickets.append(ticket)
        if row.get("company_id") is not None:
            companies[str(row["company_id"])] = row.get("company_name")
        grouped[row.get("company_name")][row.get("sla_name") or "No SLA"].append(ticket)
    sorted_grouped = {company: dict(grouped[company]) for company in sorted(grouped)}
    return tickets, companies, sorted_grouped


def _met_rate(values):
    return sum(values) / len(values) if values else 0


def _pivot_row(resource, fr_met, res_met):
    return {
        "resource": resource,
        "avgFirstResponseMet": _met_rate(fr_met),
        "avgResolvedMet": _met_rate(res_met),
        "ticketCount": max(len(fr_met), len(res_met)),
    }


def _resource_pivot(tickets):
    """Met rates per assigned resource, with a Grand Total row last."""
    stats = defaultdict(lambda: {"fr_met": [], "res_met": []})
    for ticket in tickets:
        if ticket.get("_priorityId") == SLA_NO_METRICS_PRIORITY:
            continue
        resource = ticket.get("resource") or "(blank)"
        for key, field in (("fr_met", "firstResponseMet"), ("res_met", "resolvedMet")):
            if ticket.get(field) is not None:
                stats[resource][key].append(1 if ticket[field] else 0)
    pivot = [_pivot_row(r, stats[r]["fr_met"], stats[r]["res_met"]) for r in sorted(stats)]
    all_fr = [v for s in stats.values() for v in s["fr_met"]]
    all_res = [v for s in stats.values() for v in s["res_met"]]
    pivot.append(_pivot_row("Grand Total", all_fr, all_res))
    return pivot


def _priority_label(priority_id):
    # aggregate() runs on cached rows and must not need Autotask in demo mode.
    if settings.demo_mode:
        return TICKET_PRIORITY_LABELS.get(priority_id, str(priority_id))
    return _label("priority", priority_id)


def aggregate(rows, year, month):
    """Rebuild the SLA report (tickets, grouped, pivot, targets) from stored rows."""
    tickets, companies, grouped = _load_tickets(rows)
    return {
        "tickets": tickets,
        "companies": companies,
        "grouped": grouped,
        "pivot": _resource_pivot(tickets),
        "slaTargets": {_priority_label(pid): targets for pid, targets in SLA_TARGETS.items()},
        "month": month,
        "year": year,
    }


def get_sla_report(year, month, logger=print, refresh=False):
    """Read-through cached SLA report for a month, across all companies."""
    rows, synced_at, cached = get_cached_rows(
        snapshot(year, month),
        lambda log: fetch_rows(year, month, log),
        refresh=refresh,
        logger=logger,
    )
    if cached:
        logger(f"[INFO] SLA report served from cache (synced_at={synced_at})")
    result = aggregate(rows, year, month)
    result["synced_at"] = synced_at
    return result


def refresh_snapshot(year, month, logger=print):
    return get_cached_rows(
        snapshot(year, month),
        lambda log: fetch_rows(year, month, log),
        refresh=True,
        logger=logger,
    )
