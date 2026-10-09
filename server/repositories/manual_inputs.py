"""Hand-entered report values (licence counts and the like), keyed per agency."""

from repositories import sqlite


def get_manual_inputs(agency_key, report_type):
    """{field_key: value} for one agency and report; empty when nothing is saved."""
    rows = sqlite.query(
        "SELECT field_key, value FROM manual_inputs WHERE agency_key=? AND report_type=?",
        (str(agency_key), report_type),
    )
    return {r["field_key"]: r["value"] for r in rows}


def set_manual_input(agency_key, report_type, field_key, value):
    sqlite.execute(
        """
        INSERT INTO manual_inputs (agency_key, report_type, field_key, value, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(agency_key, report_type, field_key) DO UPDATE SET
            value=excluded.value, updated_at=excluded.updated_at
        """,
        (str(agency_key), report_type, field_key, value, sqlite.iso_now()),
    )
