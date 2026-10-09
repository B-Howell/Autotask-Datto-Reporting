"""Read-through cache over the per-report snapshot tables, plus sync bookkeeping."""

from dataclasses import dataclass

from config import settings
from repositories import sqlite


@dataclass(frozen=True)
class Snapshot:
    """Identifies one cached snapshot: a report type, its table, and the scope rows carry."""

    report_type: str
    table: str
    scope: dict

    @property
    def params_key(self):
        """Stable key for sync_state, e.g. 'company_id=1004&site_id=ab'."""
        return "&".join(f"{k}={self.scope[k]}" for k in self.scope)

    @property
    def where(self):
        return " AND ".join(f"{col}=?" for col in self.scope), tuple(self.scope.values())


def read_rows(snapshot):
    where, params = snapshot.where
    return sqlite.query(f"SELECT * FROM {snapshot.table} WHERE {where}", params)


def get_cached_rows(snapshot, fetch_rows, refresh=False, logger=print):
    """Rows for a snapshot, fetching and storing them on a miss.

    Returns (rows, synced_at, was_cached). On a hit the stored rows come back
    as they are. On a miss or an explicit refresh, `fetch_rows(logger)` is
    called, the scope is snapshot-replaced, and sync_state records the outcome
    either way so a report whose refresh keeps failing is visible as such.
    """
    if not refresh:
        rows = read_rows(snapshot)
        if rows:
            return rows, rows[0].get("synced_at"), True
        # An empty snapshot is still a snapshot: an agency with no disk-space
        # tickets must not be refetched on every read just because nothing
        # came back. sync_state is what says the scope has been fetched.
        synced_at = _synced_ok_at(snapshot)
        if synced_at:
            return [], synced_at, True

    if settings.demo_mode:
        from demo import fetch_for

        def fetch_rows(log, _snapshot=snapshot):
            return fetch_for(_snapshot.report_type, _snapshot.scope, log)

    now = sqlite.iso_now()
    try:
        rows = fetch_rows(logger)
        for row in rows:
            row["synced_at"] = now
        sqlite.replace_scope(snapshot.table, snapshot.scope, rows)
        set_sync_state(snapshot.report_type, snapshot.params_key, now, status="ok")
        return rows, now, False
    except Exception as exc:
        set_sync_state(
            snapshot.report_type, snapshot.params_key, now, status="error", error=str(exc)
        )
        raise


def _synced_ok_at(snapshot):
    rows = sqlite.query(
        "SELECT last_synced_at FROM sync_state WHERE report_type=? AND params_key=? AND status='ok'",
        (snapshot.report_type, snapshot.params_key),
    )
    return rows[0]["last_synced_at"] if rows else None


def set_sync_state(report_type, params_key, last_synced_at, status="ok", error=None):
    sqlite.execute(
        """
        INSERT INTO sync_state (report_type, params_key, last_synced_at, status, error)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(report_type, params_key) DO UPDATE SET
            last_synced_at=excluded.last_synced_at,
            status=excluded.status,
            error=excluded.error
        """,
        (report_type, params_key, last_synced_at, status, error),
    )


def list_sync_state():
    return sqlite.query("SELECT * FROM sync_state ORDER BY report_type, params_key")


def last_sync_time():
    """Most recent successful sync across all reports; persists across restarts."""
    rows = sqlite.query("SELECT MAX(last_synced_at) AS t FROM sync_state WHERE status='ok'")
    return rows[0]["t"] if rows else None


def device_office_coverage():
    """Per device scope, how many rows have a blank Office version.

    A wholesale enrichment failure shows up here as a number rather than as a
    silently empty column.
    """
    return sqlite.query(
        """
        SELECT company_id, site_id, COUNT(*) AS devices,
               SUM(CASE WHEN TRIM(COALESCE(office_version,'')) = '' THEN 1 ELSE 0 END)
                   AS blank_office,
               MAX(synced_at) AS synced_at
        FROM device_rows GROUP BY company_id, site_id
        """
    )
