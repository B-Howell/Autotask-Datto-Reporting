"""Which period a scheduled run reports on, relative to the day it runs.

A schedule fires early in a month, and the report it sends is about time that
has finished: the month before, the quarter before, or the reporting year
that the previous month belongs to. The calendar arithmetic itself already
lives in the utilization service, whose helpers return inclusive date pairs;
this module only picks which period to ask for and renders the ISO strings
the report requests take.
"""

from datetime import date

from services import utilization


def previous_month(today):
    """(year, month) of the month before `today`'s."""
    if today.month == 1:
        return today.year - 1, 12
    return today.year, today.month - 1


def previous_quarter(today):
    """Inclusive ISO date strings for the calendar quarter before `today`'s."""
    quarter = (today.month - 1) // 3 + 1
    year, previous = (today.year - 1, 4) if quarter == 1 else (today.year, quarter - 1)
    start, end = utilization.quarter_range(year, previous)
    return start.isoformat(), end.isoformat()


def fiscal_year_of_previous_month(today):
    """Inclusive ISO date strings for the reporting year the previous month falls in."""
    year, month = previous_month(today)
    start, end = utilization.fiscal_year_range(
        utilization.current_fiscal_year(date(year, month, 1))
    )
    return start.isoformat(), end.isoformat()
