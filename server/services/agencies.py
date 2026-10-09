"""The list of agencies this deployment reports on.

Stored as JSON under the data directory rather than in SQLite because it is
edited by hand as often as by the app, and a small readable file is easier to
inspect or restore than a table. Each entry pairs an Autotask company id with
the Datto RMM site that holds its agents.
"""

import json
import os
from threading import Lock

from config import settings

AGENCIES_FILE = os.path.join(settings.data_dir, "agencies.json")
_lock = Lock()


def _write(agencies):
    os.makedirs(settings.data_dir, exist_ok=True)
    with open(AGENCIES_FILE, "w", encoding="utf-8") as f:
        json.dump(agencies, f, indent=2)


def _load():
    """The stored list, or an empty one when the file is missing or unreadable."""
    if not os.path.exists(AGENCIES_FILE):
        return []
    try:
        with open(AGENCIES_FILE, encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        return []
    return data if isinstance(data, list) else []


def get_agencies():
    with _lock:
        return _load()


def replace_agencies(agencies):
    with _lock:
        _write(sorted(agencies, key=lambda a: a["name"].lower()))


def add_agency(agency):
    """Add an agency unless its id exists. Returns the full updated list."""
    with _lock:
        agencies = _load()
        if not any(a["id"] == agency["id"] for a in agencies):
            agencies.append(agency)
            agencies.sort(key=lambda a: a["name"].lower())
            _write(agencies)
        return agencies


def remove_agency(agency_id):
    """Remove an agency by id. Returns the full updated list."""
    with _lock:
        agencies = [a for a in _load() if a["id"] != agency_id]
        _write(agencies)
        return agencies
