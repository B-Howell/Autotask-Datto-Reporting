"""Metadata rows for the report files the browser uploads; the bytes live on disk."""

from repositories import sqlite


def insert(meta):
    return sqlite.execute(
        """
        INSERT INTO saved_reports
            (agency_id, agency_name, report_type, format, title, filename, filepath,
             size_bytes, created_at)
        VALUES (:agency_id, :agency_name, :report_type, :format, :title, :filename,
                :filepath, :size_bytes, :created_at)
        """,
        {**meta, "created_at": sqlite.iso_now()},
    )


def list_reports(agency_name=None, report_type=None):
    sql = "SELECT * FROM saved_reports"
    clauses, params = [], []
    if agency_name:
        clauses.append("agency_name=?")
        params.append(agency_name)
    if report_type:
        clauses.append("report_type=?")
        params.append(report_type)
    if clauses:
        sql += " WHERE " + " AND ".join(clauses)
    sql += " ORDER BY created_at DESC"
    return sqlite.query(sql, tuple(params))


def get(report_id):
    rows = sqlite.query("SELECT * FROM saved_reports WHERE id=?", (report_id,))
    return rows[0] if rows else None


def find_by_filename(filename):
    rows = sqlite.query("SELECT * FROM saved_reports WHERE filename=?", (filename,))
    return rows[0] if rows else None


def touch(report_id, size_bytes, filepath=None):
    """Refresh size and timestamp after an in-place overwrite."""
    if filepath is not None:
        sqlite.execute(
            "UPDATE saved_reports SET size_bytes=?, filepath=?, created_at=? WHERE id=?",
            (size_bytes, filepath, sqlite.iso_now(), report_id),
        )
    else:
        sqlite.execute(
            "UPDATE saved_reports SET size_bytes=?, created_at=? WHERE id=?",
            (size_bytes, sqlite.iso_now(), report_id),
        )


def delete(report_id):
    """Delete the row and return it, so the caller can remove the file."""
    row = get(report_id)
    if row:
        sqlite.execute("DELETE FROM saved_reports WHERE id=?", (report_id,))
    return row
