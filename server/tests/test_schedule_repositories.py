from repositories import presets, schedules


def _schedule(preset_id, next_run_at, **overrides):
    return {
        "preset_id": preset_id,
        "day_of_month": 1,
        "hour": 7,
        "recipients_to": ["a@example.com"],
        "recipients_cc": [],
        "subject": "s",
        "body": "",
        "enabled": True,
        "next_run_at": next_run_at,
        **overrides,
    }


def test_preset_round_trip(temp_db):
    pid = presets.insert(
        {
            "name": "HPH devices",
            "report_type": "devices",
            "agency_key": "1000",
            "agency_name": "Harbor Point Health",
            "options": {"columns": ["Product"]},
        }
    )
    row = presets.get(pid)
    assert row["options"] == {"columns": ["Product"]}
    presets.update(pid, {"name": "Renamed"})
    assert presets.get(pid)["name"] == "Renamed"
    assert [p["id"] for p in presets.list_presets()] == [pid]
    presets.delete(pid)
    assert presets.get(pid) is None


def test_preset_insert_ignores_keys_outside_the_columns(temp_db):
    pid = presets.insert(
        {
            "name": "p",
            "report_type": "sla",
            "agency_key": None,
            "agency_name": "",
            "options": {},
            "id": 999,
            "created_at": "not-a-date",
        }
    )
    row = presets.get(pid)
    assert row["id"] == pid and row["created_at"] != "not-a-date"
    presets.update(pid, {"created_at": "still-not-a-date", "options": None})
    assert presets.get(pid)["created_at"] != "still-not-a-date"
    assert presets.get(pid)["options"] == {}


def test_schedule_round_trip_and_runs(temp_db):
    pid = presets.insert(
        {"name": "p", "report_type": "sla", "agency_key": None, "agency_name": "", "options": {}}
    )
    sid = schedules.insert(_schedule(pid, "2026-11-01T12:00:00+00:00"))
    row = schedules.get(sid)
    assert row["recipients_to"] == ["a@example.com"] and row["enabled"] is True
    rid = schedules.insert_run(sid, trigger="manual")
    schedules.finish_run(rid, status="ok", error=None, saved_report_id=7)
    runs = schedules.list_runs(sid)
    assert runs[0]["status"] == "ok" and runs[0]["saved_report_id"] == 7
    assert schedules.due(now_iso="2026-11-01T12:00:00+00:00")[0]["id"] == sid
    assert schedules.due(now_iso="2026-10-31T12:00:00+00:00") == []
    schedules.delete(sid)
    assert schedules.get(sid) is None and schedules.list_runs(sid) == []


def test_due_is_ordered_by_next_run_and_skips_disabled_and_unscheduled(temp_db):
    pid = presets.insert(
        {"name": "p", "report_type": "sla", "agency_key": None, "agency_name": "", "options": {}}
    )
    later = schedules.insert(_schedule(pid, "2026-11-02T12:00:00+00:00"))
    sooner = schedules.insert(_schedule(pid, "2026-11-01T12:00:00+00:00"))
    schedules.insert(_schedule(pid, "2026-11-01T00:00:00+00:00", enabled=False))
    schedules.insert(_schedule(pid, None))

    assert [s["id"] for s in schedules.due(now_iso="2026-11-03T00:00:00+00:00")] == [
        sooner,
        later,
    ]
    assert [s["id"] for s in schedules.due(now_iso="2026-11-01T12:00:00+00:00")] == [sooner]


def test_schedule_update_encodes_json_and_flags(temp_db):
    pid = presets.insert(
        {"name": "p", "report_type": "sla", "agency_key": None, "agency_name": "", "options": {}}
    )
    sid = schedules.insert(_schedule(pid, "2026-11-01T12:00:00+00:00"))
    schedules.update(
        sid,
        {
            "recipients_cc": ["c@example.com"],
            "enabled": False,
            "last_status": "error",
            "id": 42,
        },
    )
    row = schedules.get(sid)
    assert row["id"] == sid
    assert row["recipients_cc"] == ["c@example.com"]
    assert row["enabled"] is False and row["last_status"] == "error"
    assert [s["id"] for s in schedules.list_schedules()] == [sid]


def test_due_compares_a_microsecond_now_against_second_precision_rows(temp_db):
    pid = presets.insert(
        {"name": "p", "report_type": "sla", "agency_key": None, "agency_name": "", "options": {}}
    )
    sid = schedules.insert(_schedule(pid, "2026-11-01T12:00:00+00:00"))

    assert [s["id"] for s in schedules.due(now_iso="2026-11-01T12:00:00.000001+00:00")] == [sid]
    assert schedules.due(now_iso="2026-11-01T11:59:59.999999+00:00") == []


def test_list_for_preset_returns_only_that_presets_schedules(temp_db):
    first = presets.insert(
        {"name": "a", "report_type": "sla", "agency_key": None, "agency_name": "", "options": {}}
    )
    second = presets.insert(
        {"name": "b", "report_type": "sla", "agency_key": None, "agency_name": "", "options": {}}
    )
    s1 = schedules.insert(_schedule(first, None))
    s2 = schedules.insert(_schedule(first, None))
    schedules.insert(_schedule(second, None))

    assert [s["id"] for s in schedules.list_for_preset(first)] == [s1, s2]
    assert schedules.list_for_preset(first + second) == []


def test_cache_version_bump_keeps_presets_schedules_and_runs(temp_db):
    sqlite = temp_db
    pid = presets.insert(
        {"name": "p", "report_type": "sla", "agency_key": None, "agency_name": "", "options": {}}
    )
    sid = schedules.insert(_schedule(pid, None))
    rid = schedules.insert_run(sid, trigger="manual")
    sqlite.replace_scope(
        "device_rows",
        {"company_id": 1, "site_id": "s"},
        [{"name": "pc-1", "synced_at": sqlite.iso_now()}],
    )
    assert sqlite.query("SELECT COUNT(*) AS n FROM device_rows")[0]["n"] == 1

    conn = sqlite.get_conn()
    conn.execute("UPDATE cache_meta SET value = '1' WHERE key = 'version'")
    sqlite._discard_stale_cache(conn)
    conn.commit()

    assert sqlite.query("SELECT COUNT(*) AS n FROM device_rows")[0]["n"] == 0
    assert presets.get(pid) is not None
    assert schedules.get(sid) is not None
    assert [r["id"] for r in schedules.list_runs(sid)] == [rid]
    assert sqlite.query("SELECT value FROM cache_meta WHERE key = 'version'")[0]["value"] == str(
        sqlite.CACHE_VERSION
    )


def test_list_runs_without_a_schedule_returns_newest_first_across_schedules(temp_db):
    pid = presets.insert(
        {"name": "p", "report_type": "sla", "agency_key": None, "agency_name": "", "options": {}}
    )
    first = schedules.insert(_schedule(pid, None))
    second = schedules.insert(_schedule(pid, None))
    schedules.insert_run(first, trigger="scheduled")
    schedules.insert_run(second, trigger="manual")

    runs = schedules.list_runs()
    assert {r["schedule_id"] for r in runs} == {first, second}
    assert runs[0]["status"] == "running" and runs[0]["finished_at"] is None
    assert schedules.list_runs(limit=1) == runs[:1]
