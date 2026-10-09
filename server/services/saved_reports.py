"""Report files uploaded from the browser, kept on disk with a metadata row."""

import os
import uuid

from config import settings
from repositories import saved_reports as repo

SAVED_REPORTS_DIR = os.path.join(settings.data_dir, "saved_reports")


def _write_file(path, data):
    os.makedirs(SAVED_REPORTS_DIR, exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)


def _new_path(ext):
    return os.path.join(SAVED_REPORTS_DIR, f"{uuid.uuid4().hex}.{ext}")


def _extension(filename, fmt):
    if fmt:
        return fmt.lower()
    return filename.rsplit(".", 1)[-1].lower() if "." in (filename or "") else "bin"


def save(data, filename, meta):
    """Store a report. Re-saving the same filename overwrites in place.

    The filename encodes agency, report and date, so an export repeated the
    same day replaces its earlier copy instead of piling up duplicates.
    """
    ext = _extension(filename, meta.get("format"))
    existing = repo.find_by_filename(filename)
    if existing:
        path = existing["filepath"]
        try:
            _write_file(path, data)
            repo.touch(existing["id"], len(data))
        except OSError:
            path = _new_path(ext)
            _write_file(path, data)
            repo.touch(existing["id"], len(data), filepath=path)
        return {"id": existing["id"], "deduped": True}

    path = _new_path(ext)
    _write_file(path, data)
    agency_id = meta.get("agency_id")
    report_id = repo.insert(
        {
            "agency_id": int(agency_id) if str(agency_id).isdigit() else None,
            "agency_name": meta.get("agency_name", ""),
            "report_type": meta.get("report_type", ""),
            "format": ext,
            "title": meta.get("title", ""),
            "filename": filename,
            "filepath": path,
            "size_bytes": len(data),
        }
    )
    return {"id": report_id, "deduped": False}


def list_reports(agency_name=None, report_type=None):
    return repo.list_reports(agency_name, report_type)


def get_file(report_id):
    """(path, download name) for a stored report, or None if it is gone."""
    row = repo.get(report_id)
    if not row or not os.path.exists(row["filepath"]):
        return None
    return row["filepath"], row["filename"] or f"report-{report_id}"


def delete(report_id):
    row = repo.delete(report_id)
    if row and row.get("filepath") and os.path.exists(row["filepath"]):
        try:
            os.remove(row["filepath"])
        except OSError:
            pass
    return bool(row)
