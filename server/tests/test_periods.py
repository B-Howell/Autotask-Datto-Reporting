from datetime import date

from services import periods, utilization


def test_previous_month():
    assert periods.previous_month(date(2026, 1, 15)) == (2025, 12)
    assert periods.previous_month(date(2026, 10, 1)) == (2026, 9)
    assert periods.previous_month(date(2026, 12, 31)) == (2026, 11)


def test_previous_quarter_range():
    assert periods.previous_quarter(date(2026, 10, 1)) == ("2026-07-01", "2026-09-30")
    assert periods.previous_quarter(date(2026, 2, 3)) == ("2025-10-01", "2025-12-31")
    assert periods.previous_quarter(date(2026, 4, 30)) == ("2026-01-01", "2026-03-31")
    assert periods.previous_quarter(date(2026, 7, 1)) == ("2026-04-01", "2026-06-30")


def test_fiscal_year_containing_previous_month(monkeypatch):
    # The arithmetic lives in the utilization service, which reads the rule
    # from its own module name, so that is where the override goes.
    monkeypatch.setattr(utilization, "FISCAL_START_MONTH", 9)
    assert periods.fiscal_year_of_previous_month(date(2026, 10, 1)) == ("2026-09-01", "2027-08-31")
    assert periods.fiscal_year_of_previous_month(date(2026, 9, 1)) == ("2025-09-01", "2026-08-31")
    # Run on 1 Sep: the previous month is August, the last month of FY 2025-26.
    assert periods.fiscal_year_of_previous_month(date(2026, 9, 30)) == ("2025-09-01", "2026-08-31")


def test_fiscal_year_is_the_calendar_year_when_it_starts_in_january(monkeypatch):
    monkeypatch.setattr(utilization, "FISCAL_START_MONTH", 1)
    assert periods.fiscal_year_of_previous_month(date(2026, 1, 1)) == ("2025-01-01", "2025-12-31")
    assert periods.fiscal_year_of_previous_month(date(2026, 2, 1)) == ("2026-01-01", "2026-12-31")
