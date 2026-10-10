"""SQLite persistence: schema, migrations and the snapshot-swap primitive.

The database file lives under the data directory (volume-mounted in Docker),
so it survives container redeploys. The stdlib sqlite3 module is enough: the
only shapes stored are flat snapshot rows and a few small tables.

Concurrency: uvicorn serves requests on a threadpool, so one shared connection
is opened with check_same_thread=False and every statement goes through a
module-level lock. WAL mode lets readers proceed while a snapshot is written.

The per-report tables are point-in-time snapshots. A sync (or a cache miss)
replaces every row for a scope (an agency, or a reporting period) in one
transaction via replace_scope() rather than upserting row by row: the vendor
APIs stay the source of truth and the database is only a fast local mirror,
so there is nothing to merge and no stale rows can survive a refresh.
"""

import os
import sqlite3
from datetime import UTC, datetime
from threading import Lock

from config import settings

DATA_DIR = settings.data_dir
DB_FILE = os.path.join(DATA_DIR, "reports.db")

_lock = Lock()
_conn = None


def get_conn():
    """Return the shared connection, opening + initializing it on first use."""
    global _conn
    if _conn is None:
        os.makedirs(DATA_DIR, exist_ok=True)
        _conn = sqlite3.connect(DB_FILE, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _conn.execute("PRAGMA journal_mode=WAL")
        _conn.execute("PRAGMA foreign_keys=ON")
        _init_schema(_conn)
    return _conn


# ── Schema ──────────────────────────────────────────────────────────────────
# Per-report tables mirror each endpoint's existing payload shape. Snapshot
# columns carry the scope (agency_id or period) + synced_at so a report can show
# "data as of <synced_at>".
_SCHEMA = """
CREATE TABLE IF NOT EXISTS sync_state (
    report_type     TEXT NOT NULL,
    params_key      TEXT NOT NULL,
    last_synced_at  TEXT,
    status          TEXT,
    error           TEXT,
    PRIMARY KEY (report_type, params_key)
);

-- Manually-entered values (e.g. Office/Windows license counts), scoped per
-- agency. agency_key is TEXT so it holds a single agency's id ("1004") or a
-- group key ("group:Example Schools"). Keyed by (agency, report, field) so values
-- carry forward across months without ever bleeding between agencies.
CREATE TABLE IF NOT EXISTS manual_inputs (
    agency_key   TEXT NOT NULL,
    report_type  TEXT NOT NULL,
    field_key    TEXT NOT NULL,
    value        TEXT,
    updated_at   TEXT,
    PRIMARY KEY (agency_key, report_type, field_key)
);

CREATE TABLE IF NOT EXISTS saved_reports (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    agency_id    INTEGER,
    agency_name  TEXT,
    report_type  TEXT,
    format       TEXT,
    title        TEXT,
    filename     TEXT,
    filepath     TEXT,
    size_bytes   INTEGER,
    created_at   TEXT
);

-- Scheduled delivery. A preset is one report as configured on screen, a
-- schedule attaches a day, an hour and recipients to a preset, and a run
-- records each attempt. These rows are user data with no upstream copy, so
-- they are never listed in _STALE_ON_UPGRADE and a CACHE_VERSION bump must
-- not touch them.
CREATE TABLE IF NOT EXISTS report_presets (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    report_type  TEXT NOT NULL,
    agency_key   TEXT,
    agency_name  TEXT NOT NULL DEFAULT '',
    options      TEXT NOT NULL DEFAULT '{}',
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS report_schedules (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    preset_id      INTEGER NOT NULL,
    day_of_month   INTEGER NOT NULL,
    hour           INTEGER NOT NULL DEFAULT 7,
    recipients_to  TEXT NOT NULL DEFAULT '[]',
    recipients_cc  TEXT NOT NULL DEFAULT '[]',
    subject        TEXT NOT NULL DEFAULT '',
    body           TEXT NOT NULL DEFAULT '',
    enabled        INTEGER NOT NULL DEFAULT 1,
    next_run_at    TEXT,
    last_run_at    TEXT,
    last_status    TEXT,
    last_error     TEXT,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schedule_runs (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id      INTEGER NOT NULL,
    trigger          TEXT NOT NULL,
    started_at       TEXT NOT NULL,
    finished_at      TEXT,
    status           TEXT NOT NULL DEFAULT 'running',
    error            TEXT,
    saved_report_id  INTEGER
);

-- Vendor credentials entered on the Settings page, one row per field, the
-- value encrypted by core/secrets.py. User data with no upstream copy: never
-- list this table in _STALE_ON_UPGRADE.
CREATE TABLE IF NOT EXISTS credentials (
    name            TEXT PRIMARY KEY,
    ciphertext      BLOB NOT NULL,
    updated_at      TEXT NOT NULL,
    last_tested_at  TEXT,
    last_test_ok    INTEGER
);

-- Devices: one row per merged device (display columns from build_spreadsheet_data).
-- Scope = (company_id, site_id), the exact params the /api/devices endpoint gets.
CREATE TABLE IF NOT EXISTS device_rows (
    company_id           INTEGER NOT NULL,
    site_id              TEXT NOT NULL,
    type                 TEXT,
    name                 TEXT,
    serial               TEXT,
    ip                   TEXT,
    primary_user_or_role TEXT,
    purchase_date        TEXT,
    department           TEXT,
    location             TEXT,
    last_user            TEXT,
    last_seen            TEXT,
    manufacturer         TEXT,
    model                TEXT,
    processor            TEXT,
    memory_gb            TEXT,
    storage_gb           TEXT,
    operating_system     TEXT,
    office_version       TEXT,
    antivirus_status     TEXT,
    patch_status         TEXT,
    autotask_id          INTEGER,
    synced_at            TEXT
);
CREATE INDEX IF NOT EXISTS idx_device_rows_scope ON device_rows(company_id, site_id);

-- Patch management: one row per workstation. Scope = site_id.
CREATE TABLE IF NOT EXISTS patch_rows (
    site_id          TEXT NOT NULL,
    hostname         TEXT,
    description      TEXT,
    last_user        TEXT,
    last_reboot      TEXT,
    installed        INTEGER,
    approved_pending INTEGER,
    not_approved     INTEGER,
    status           TEXT,
    status_label     TEXT,
    synced_at        TEXT
);
CREATE INDEX IF NOT EXISTS idx_patch_rows_site ON patch_rows(site_id);

-- Office/Windows: one row per counted product (kind = 'os' | 'office').
-- Scope = (company_id, site_id).
CREATE TABLE IF NOT EXISTS office_windows_counts (
    company_id   INTEGER NOT NULL,
    site_id      TEXT NOT NULL,
    kind         TEXT NOT NULL,
    product      TEXT,
    installs     INTEGER,
    devices_json TEXT,
    synced_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_ow_counts_scope ON office_windows_counts(company_id, site_id);

-- Tickets: one row per ticket. Scope = (company_id, year, month). Serves both
-- the count and the details breakdowns (aggregate recomputes from these rows).
CREATE TABLE IF NOT EXISTS ticket_rows (
    company_id               INTEGER NOT NULL,
    year                     INTEGER NOT NULL,
    month                    INTEGER NOT NULL,
    ticket_id                INTEGER,
    source                   INTEGER,
    priority                 INTEGER,
    issue_type               INTEGER,
    sub_issue_type           INTEGER,
    status                   INTEGER,
    create_date              TEXT,
    completed_date           TEXT,
    creator_resource_id      INTEGER,
    completed_by_resource_id INTEGER,
    synced_at                TEXT
);
CREATE INDEX IF NOT EXISTS idx_ticket_rows_scope ON ticket_rows(company_id, year, month);

-- SLA: one row per SLA ticket for a month. Key columns are queryable; data_json
-- holds the full processed ticket so the report round-trips with full fidelity.
CREATE TABLE IF NOT EXISTS sla_ticket_rows (
    year               INTEGER NOT NULL,
    month              INTEGER NOT NULL,
    ticket_id          INTEGER,
    company_id         INTEGER,
    company_name       TEXT,
    sla_name           TEXT,
    priority_id        INTEGER,
    resource           TEXT,
    first_response_met INTEGER,
    resolved_met       INTEGER,
    data_json          TEXT,
    synced_at          TEXT
);
CREATE INDEX IF NOT EXISTS idx_sla_rows_scope ON sla_ticket_rows(year, month);

-- Utilization: flattened aggregation, one row per (category, worker, company).
-- Scoped by an inclusive date range rather than a named period, so any range
-- the UI offers (a quarter, the Sep-Aug year, something arbitrary) caches the
-- same way. aggregate() rebuilds totals and ordering from these rows.
CREATE TABLE IF NOT EXISTS util_time_rows (
    period_start TEXT NOT NULL,
    period_end   TEXT NOT NULL,
    category     TEXT,
    worker       TEXT,
    company      TEXT,
    hours        REAL,
    synced_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_util_rows_scope
    ON util_time_rows(period_start, period_end);

-- The individual time entries behind a utilization report. Stored so the raw
-- export does not have to page a year of Autotask a second time.
CREATE TABLE IF NOT EXISTS util_entry_rows (
    period_start TEXT NOT NULL,
    period_end   TEXT NOT NULL,
    date         TEXT,
    company      TEXT,
    ticket       TEXT,
    title        TEXT,
    resource     TEXT,
    hours        REAL,
    role         TEXT,
    synced_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_util_entry_scope
    ON util_entry_rows(period_start, period_end);

-- HDD storage tickets: one row per active device, per agency (company).
CREATE TABLE IF NOT EXISTS hdd_ticket_rows (
    company_id   INTEGER NOT NULL,
    device_name  TEXT,
    ticket_count INTEGER,
    last_user    TEXT,
    c_drive_gb   REAL,
    synced_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_hdd_rows_company ON hdd_ticket_rows(company_id);
"""


# Columns added after the initial release. CREATE TABLE IF NOT EXISTS won't add
# them to an existing table, so we ALTER them in idempotently on startup.
_MIGRATIONS = [
    ("patch_rows", "last_user", "TEXT"),
    ("device_rows", "autotask_id", "INTEGER"),
]


# Tables whose scope columns changed shape. These hold nothing but a cache of
# what the upstream APIs already have, so the cheapest correct migration is to
# drop the old snapshot and let it refetch, rather than backfill columns that
# were NOT NULL.
_REPLACED_TABLES = [
    ("util_time_rows", "quarter"),  # year/quarter -> period_start/period_end
    ("util_entry_rows", "notes"),  # dropped work_type/billable/notes
]

# A cached snapshot is only as good as the code that built it. When a fix
# changes what a report WOULD produce, the stored rows are wrong and no amount
# of re-running helps, because re-running reads the cache. Bump this and name
# the tables whose contents are now untrustworthy; they are emptied once on
# startup and refetched on next view.
#
# 2: company id 0 - the MSP's own account - was treated as "no company" because
#    zero is falsy, so internal work was filed under "(Unassigned)".
# 3: internal non-billable time (PTO and the like, on deleted tasks) is labelled
#    as such instead of being lumped in with genuinely unresolved time.
# 4: that time is named "Internal" rather than "(Unassigned)".
# 5: device rows carry the configuration item id so grid edits can be written
#    back; rows cached before that have no id to write to.
CACHE_VERSION = 5
_STALE_ON_UPGRADE = ["util_time_rows", "util_entry_rows", "device_rows", "sync_state"]


def _discard_stale_cache(conn):
    """Empty caches whose stored rows predate a fix that changes their contents."""
    conn.execute("CREATE TABLE IF NOT EXISTS cache_meta (key TEXT PRIMARY KEY, value TEXT)")
    row = conn.execute("SELECT value FROM cache_meta WHERE key='version'").fetchone()
    have = int(row["value"]) if row else 0
    if have >= CACHE_VERSION:
        return
    for table in _STALE_ON_UPGRADE:
        exists = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)
        ).fetchone()
        if exists:
            conn.execute(f"DELETE FROM {table}")
    conn.execute(
        "INSERT INTO cache_meta (key, value) VALUES ('version', ?) "
        "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (str(CACHE_VERSION),),
    )


def _migrate(conn):
    for table, gone_column in _REPLACED_TABLES:
        cols = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}
        if gone_column in cols:
            conn.execute(f"DROP TABLE {table}")
            conn.executescript(_SCHEMA)

    for table, column, coldef in _MIGRATIONS:
        cols = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}
        if column not in cols:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {coldef}")

    _discard_stale_cache(conn)
    conn.commit()


def _init_schema(conn):
    conn.executescript(_SCHEMA)
    conn.commit()
    _migrate(conn)


def init_db():
    """Public entry point; call once on app startup."""
    get_conn()


# ── Helpers ─────────────────────────────────────────────────────────────────
def query(sql, params=()):
    """Run a SELECT and return a list of plain dicts."""
    conn = get_conn()
    with _lock:
        cur = conn.execute(sql, params)
        return [dict(row) for row in cur.fetchall()]


def execute(sql, params=()):
    """Run a single write statement; returns lastrowid."""
    conn = get_conn()
    with _lock:
        cur = conn.execute(sql, params)
        conn.commit()
        return cur.lastrowid


def replace_scope(table, scope, rows):
    """Replace all rows in `table` for a scope (a snapshot swap).

    `scope` is a dict of column -> value identifying the snapshot (e.g.
    {"company_id": 1004} or {"year": 2026, "month": 7}). Every existing row
    matching the scope is deleted, then `rows` (a list of dicts) is inserted
    with the scope columns merged in. Runs in one transaction so a report never
    sees a half-written snapshot.
    """
    conn = get_conn()
    where = " AND ".join(f"{col}=?" for col in scope)
    where_vals = tuple(scope.values())
    with _lock:
        try:
            conn.execute("BEGIN")
            conn.execute(f"DELETE FROM {table} WHERE {where}", where_vals)
            for row in rows:
                merged = {**scope, **row}
                cols = list(merged.keys())
                placeholders = ",".join("?" for _ in cols)
                conn.execute(
                    f"INSERT INTO {table} ({','.join(cols)}) VALUES ({placeholders})",
                    tuple(merged[c] for c in cols),
                )
            conn.commit()
        except Exception:
            conn.rollback()
            raise


def iso_now():
    return datetime.now(UTC).isoformat()
