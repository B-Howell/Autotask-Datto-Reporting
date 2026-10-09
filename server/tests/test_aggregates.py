"""Aggregate functions, fed by the demo generators.

The generators produce rows in exactly the shape the real fetches store, so
these tests check the aggregates against the same input the app runs on.
"""

from datetime import UTC, datetime

from demo import data as demo
from report_rules import TICKET_PRIORITY_ORDER, TICKET_SOURCE_ORDER
from services import sla, tickets, utilization

QUIET = lambda message: None  # noqa: E731


def test_ticket_breakdowns_sum_to_the_ticket_count():
    rows = demo.tickets(1003, 2026, 3, QUIET)
    report = tickets.aggregate(rows, logger=QUIET)

    assert report["total_tickets"] == len(rows)
    assert sum(report["source_breakdown"].values()) == len(rows)
    assert sum(report["priority_breakdown"].values()) == len(rows)
    assert list(report["source_breakdown"]) == [f"{s} Count" for s in TICKET_SOURCE_ORDER]
    assert list(report["priority_breakdown"]) == [f"{p} Count" for p in TICKET_PRIORITY_ORDER]


def test_first_call_resolution_counts_only_phone_tickets_closed_same_day_by_taker():
    rows = demo.tickets(1003, 2026, 3, QUIET)
    report = tickets.aggregate(rows, logger=QUIET)
    fcr = report["first_call_resolution"]

    phone = [r for r in rows if r["source"] == 2]
    same_day = [
        r
        for r in phone
        if r["status"] == 5
        and r["creator_resource_id"] == r["completed_by_resource_id"]
        and r["create_date"][:10] == (r["completed_date"] or "")[:10]
    ]
    assert fcr["phone_tickets_total"] == len(phone)
    assert fcr["phone_tickets_fcr"] == len(same_day)
    assert fcr["percentage"] == round(len(same_day) / len(phone) * 100, 2)


def test_business_hours_skip_nights_and_weekends():
    friday_4pm = datetime(2026, 10, 9, 16, tzinfo=UTC)
    monday_10am = datetime(2026, 10, 12, 10, tzinfo=UTC)
    assert sla.business_hours_between(friday_4pm, monday_10am) == 3.0
    assert sla.business_hours_between(monday_10am, friday_4pm) == 0.0


def test_sla_pivot_grand_total_matches_the_tickets():
    rows = demo.sla(2026, 3, QUIET)
    report = sla.aggregate(rows, 2026, 3)

    grand = report["pivot"][-1]
    assert grand["resource"] == "Grand Total"
    assert grand["ticketCount"] == len(rows)
    assert sum(p["ticketCount"] for p in report["pivot"][:-1]) == len(rows)
    assert set(report["companies"].values()) == {r["company_name"] for r in rows}


def test_utilization_totals_reconcile():
    rows, entries = demo.utilization("2026-07-01", "2026-09-30", QUIET)
    report = utilization.aggregate(rows, "2026-07-01", "2026-09-30")

    assert report["periodLabel"] == "Q3 2026"
    assert report["grandTotal"] == round(sum(r["hours"] for r in rows), 2)
    assert report["grandTotal"] == round(sum(report["companyTotals"].values()), 2)
    assert report["companies"][-1] == "Internal"
    assert len(entries) > len(rows)


def test_period_labels_name_the_presets():
    assert utilization.period_label("2025-09-01", "2026-08-31") == "FY 2025-26"
    assert utilization.period_label("2026-01-01", "2026-03-31") == "Q1 2026"
    assert utilization.period_label("2026-01-01", "2026-12-31") == "2026"
    assert utilization.period_label("2026-02-03", "2026-02-20") == "03 Feb 2026 - 20 Feb 2026"
