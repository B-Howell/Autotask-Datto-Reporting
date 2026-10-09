import pytest

from repositories.snapshots import Snapshot, get_cached_rows, list_sync_state

PATCH = Snapshot("patch", "patch_rows", {"site_id": "site-a"})


def _rows(n):
    return [
        {
            "hostname": f"WS-{i:03d}",
            "description": "",
            "last_user": "",
            "last_reboot": "",
            "installed": 10,
            "approved_pending": 0,
            "not_approved": 0,
            "status": "FullyPatched",
            "status_label": "Fully Patched",
        }
        for i in range(n)
    ]


def test_miss_fetches_stores_and_records_sync_state(temp_db):
    calls = []

    def fetch(logger):
        calls.append(1)
        return _rows(3)

    rows, synced_at, cached = get_cached_rows(PATCH, fetch, logger=lambda m: None)

    assert cached is False
    assert len(rows) == 3 and synced_at
    assert [s for s in list_sync_state() if s["report_type"] == "patch"][0]["status"] == "ok"
    assert temp_db.query("SELECT COUNT(*) AS n FROM patch_rows")[0]["n"] == 3


def test_hit_returns_stored_rows_without_fetching(temp_db):
    get_cached_rows(PATCH, lambda log: _rows(2), logger=lambda m: None)

    def must_not_run(logger):
        raise AssertionError("fetch called on a cache hit")

    rows, _, cached = get_cached_rows(PATCH, must_not_run, logger=lambda m: None)
    assert cached is True
    assert {r["hostname"] for r in rows} == {"WS-000", "WS-001"}


def test_refresh_replaces_the_whole_scope(temp_db):
    get_cached_rows(PATCH, lambda log: _rows(5), logger=lambda m: None)
    rows, _, cached = get_cached_rows(
        PATCH, lambda log: _rows(1), refresh=True, logger=lambda m: None
    )

    assert cached is False
    assert len(rows) == 1
    assert temp_db.query("SELECT COUNT(*) AS n FROM patch_rows")[0]["n"] == 1


def test_scopes_do_not_bleed_into_each_other(temp_db):
    other = Snapshot("patch", "patch_rows", {"site_id": "site-b"})
    get_cached_rows(PATCH, lambda log: _rows(2), logger=lambda m: None)
    get_cached_rows(other, lambda log: _rows(4), logger=lambda m: None)

    rows, _, _ = get_cached_rows(PATCH, lambda log: [], logger=lambda m: None)
    assert len(rows) == 2


def test_empty_result_is_cached_not_refetched(temp_db):
    calls = []

    def fetch(logger):
        calls.append(1)
        return []

    get_cached_rows(PATCH, fetch, logger=lambda m: None)
    rows, synced_at, cached = get_cached_rows(PATCH, fetch, logger=lambda m: None)

    assert rows == [] and cached is True and synced_at
    assert len(calls) == 1


def test_fetch_error_keeps_old_snapshot_and_records_error(temp_db):
    get_cached_rows(PATCH, lambda log: _rows(2), logger=lambda m: None)

    def broken(logger):
        raise RuntimeError("Datto is down")

    with pytest.raises(RuntimeError):
        get_cached_rows(PATCH, broken, refresh=True, logger=lambda m: None)

    assert temp_db.query("SELECT COUNT(*) AS n FROM patch_rows")[0]["n"] == 2
    state = [s for s in list_sync_state() if s["report_type"] == "patch"][0]
    assert state["status"] == "error" and "Datto is down" in state["error"]
