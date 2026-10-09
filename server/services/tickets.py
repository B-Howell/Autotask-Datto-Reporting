"""Monthly ticket breakdown for one agency.

One cached snapshot of normalised ticket rows backs the whole report:
aggregate() recomputes every breakdown from those rows, so a refresh is a
single Autotask query and the payload is a pure function of what was stored.
"""

from integrations.autotask import autotask
from report_rules import (
    PASSWORD_RESET_ISSUE_TYPE,
    PASSWORD_RESET_SUB_ISSUE_LABELS,
    TICKET_ISSUE_TYPE_DEFAULT,
    TICKET_ISSUE_TYPE_LABELS,
    TICKET_ISSUE_TYPE_ORDER,
    TICKET_PRIORITY_DEFAULT,
    TICKET_PRIORITY_LABELS,
    TICKET_PRIORITY_ORDER,
    TICKET_SOURCE_DEFAULT,
    TICKET_SOURCE_LABELS,
    TICKET_SOURCE_ORDER,
    TICKET_SOURCE_PHONE,
    TICKET_STATUS_COMPLETE,
)
from repositories.snapshots import Snapshot, get_cached_rows
from services.common import autotask_timestamp, month_bounds, parse_autotask_datetime

TICKET_FIELDS = [
    "id",
    "source",
    "priority",
    "issueType",
    "subIssueType",
    "status",
    "createDate",
    "completedDate",
    "creatorResourceID",
    "completedByResourceID",
]


# Breakdown keys are the report_rules labels plus " Count"; the client prints
# them verbatim, and these two have always been shown bare.
_BARE_KEYS = {"Password Reset", "None"}


def count_key(label):
    return label if label in _BARE_KEYS else f"{label} Count"


def _empty_counts(order):
    return {count_key(label): 0 for label in order}


def snapshot(company_id, year, month):
    return Snapshot(
        "tickets", "ticket_rows", {"company_id": company_id, "year": year, "month": month}
    )


def _ticket_row(ticket):
    return {
        "ticket_id": ticket.get("id"),
        "source": ticket.get("source"),
        "priority": ticket.get("priority"),
        "issue_type": ticket.get("issueType"),
        "sub_issue_type": ticket.get("subIssueType"),
        "status": ticket.get("status"),
        "create_date": ticket.get("createDate"),
        "completed_date": ticket.get("completedDate"),
        "creator_resource_id": ticket.get("creatorResourceID"),
        "completed_by_resource_id": ticket.get("completedByResourceID"),
    }


def fetch_rows(company_id, year, month, logger=print):
    """Every ticket the company opened in the month, as snapshot rows."""
    start, end = month_bounds(year, month)
    logger(
        f"[INFO] Retrieving tickets for company {company_id} from {start.date()} to {end.date()}"
    )
    filters = [
        {"op": "eq", "field": "companyID", "value": company_id},
        {"op": "gte", "field": "createDate", "value": autotask_timestamp(start)},
        {"op": "lt", "field": "createDate", "value": autotask_timestamp(end)},
    ]
    tickets = autotask().query_all(
        "Tickets",
        filters,
        TICKET_FIELDS,
        on_page=lambda count: logger(f"[INFO] Received {count} tickets so far"),
    )
    logger(f"[DONE] Total tickets found: {len(tickets)}")
    return [_ticket_row(t) for t in tickets]


def count_by_category(rows, field, labels, order, default):
    """{label Count: n} over `order`, mapping each row's picklist id through `labels`."""
    counts = _empty_counts(order)
    for row in rows:
        counts[count_key(labels.get(row.get(field), default))] += 1
    return counts


def count_issue_types(rows):
    """Issue-type counts; password resets are also bucketed by the system reset."""
    counts = _empty_counts(TICKET_ISSUE_TYPE_ORDER)
    for row in rows:
        issue_type = row.get("issue_type")
        if issue_type != PASSWORD_RESET_ISSUE_TYPE:
            label = TICKET_ISSUE_TYPE_LABELS.get(issue_type, TICKET_ISSUE_TYPE_DEFAULT)
            counts[count_key(label)] += 1
            continue
        counts[count_key(TICKET_ISSUE_TYPE_LABELS[PASSWORD_RESET_ISSUE_TYPE])] += 1
        sub_label = PASSWORD_RESET_SUB_ISSUE_LABELS.get(row.get("sub_issue_type"))
        if sub_label:
            counts[count_key(sub_label)] += 1
    return counts


def _priority_key(row):
    return count_key(TICKET_PRIORITY_LABELS.get(row.get("priority"), TICKET_PRIORITY_DEFAULT))


def _completed_span_days(row, logger):
    """Days from creation to completion for a completed ticket, else None."""
    if row.get("status") != TICKET_STATUS_COMPLETE:
        return None
    created = parse_autotask_datetime(row.get("create_date"))
    completed = parse_autotask_datetime(row.get("completed_date"))
    if created is None or completed is None:
        if row.get("create_date") and row.get("completed_date"):
            logger(f"[DEBUG] Unparseable dates on ticket {row.get('ticket_id')}")
        return None
    return (completed - created).total_seconds() / 86400


def repair_times(rows, logger=print):
    """Average create-to-complete days per priority, over completed tickets."""
    spans = {count_key(label): [] for label in TICKET_PRIORITY_ORDER}
    for row in rows:
        days = _completed_span_days(row, logger)
        if days is not None:
            spans[_priority_key(row)].append(days)
    return {
        priority: {
            "average_days": round(sum(times) / len(times), 2) if times else 0,
            "completed_tickets": len(times),
        }
        for priority, times in spans.items()
    }


def _resolved_same_day_by_taker(row):
    """True when whoever logged the ticket completed it the day it came in."""
    taker = row.get("creator_resource_id")
    if not taker or taker != row.get("completed_by_resource_id"):
        return False
    created = parse_autotask_datetime(row.get("create_date"))
    completed = parse_autotask_datetime(row.get("completed_date"))
    return bool(created and completed and created.date() == completed.date())


def first_call_resolution(rows):
    """Share of phone tickets closed the same day by the person who took the call."""
    phone = [r for r in rows if r.get("source") == TICKET_SOURCE_PHONE]
    resolved = sum(
        1
        for r in phone
        if r.get("status") == TICKET_STATUS_COMPLETE and _resolved_same_day_by_taker(r)
    )
    return {
        "percentage": round(resolved / len(phone) * 100, 2) if phone else 0,
        "phone_tickets_fcr": resolved,
        "phone_tickets_total": len(phone),
    }


def aggregate(rows, logger=print):
    """The ticket-details payload: breakdowns, repair times and first-call resolution."""
    return {
        "total_tickets": len(rows),
        "source_breakdown": count_by_category(
            rows, "source", TICKET_SOURCE_LABELS, TICKET_SOURCE_ORDER, TICKET_SOURCE_DEFAULT
        ),
        "priority_breakdown": count_by_category(
            rows, "priority", TICKET_PRIORITY_LABELS, TICKET_PRIORITY_ORDER, TICKET_PRIORITY_DEFAULT
        ),
        "issue_type_breakdown": count_issue_types(rows),
        "avg_time_to_repair": repair_times(rows, logger),
        "first_call_resolution": first_call_resolution(rows),
    }


def get_ticket_details(company_id, year, month, logger=print, refresh=False):
    """Read-through cached ticket-details breakdown for one company and month."""
    rows, synced_at, cached = get_cached_rows(
        snapshot(company_id, year, month),
        lambda log: fetch_rows(company_id, year, month, log),
        refresh=refresh,
        logger=logger,
    )
    if cached:
        logger(f"[INFO] Ticket details served from cache (synced_at={synced_at})")
    result = aggregate(rows, logger=logger)
    result["synced_at"] = synced_at
    return result


def refresh_snapshot(company_id, year, month, logger=print):
    return get_cached_rows(
        snapshot(company_id, year, month),
        lambda log: fetch_rows(company_id, year, month, log),
        refresh=True,
        logger=logger,
    )
