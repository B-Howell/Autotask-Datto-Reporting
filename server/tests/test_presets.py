import pytest

from services import presets


def test_unknown_report_type_is_rejected(temp_db):
    with pytest.raises(ValueError, match="report type"):
        presets.create({"name": "x", "report_type": "nope", "agency_key": "1", "options": {}})


def test_device_preset_needs_an_agency_and_sla_must_not_have_one(temp_db):
    with pytest.raises(ValueError, match="agency"):
        presets.create({"name": "x", "report_type": "devices", "agency_key": None, "options": {}})
    created = presets.create(
        {"name": "sla", "report_type": "sla", "agency_key": "1000", "options": {}}
    )
    assert created["agency_key"] is None


def test_options_are_filtered_to_the_known_keys(temp_db):
    created = presets.create(
        {
            "name": "x",
            "report_type": "office_windows",
            "agency_key": "1000",
            "agency_name": "A",
            "options": {"format": "pdf", "showLicenses": True, "junk": 1},
        }
    )
    assert created["options"] == {"format": "pdf", "showLicenses": True}
    with pytest.raises(ValueError, match="format"):
        presets.create(
            {
                "name": "x",
                "report_type": "office_windows",
                "agency_key": "1000",
                "options": {"format": "txt"},
            }
        )


def test_device_columns_must_be_a_list_of_names(temp_db):
    with pytest.raises(ValueError, match="columns"):
        presets.create(
            {
                "name": "x",
                "report_type": "devices",
                "agency_key": "1000",
                "options": {"columns": "Product"},
            }
        )
    created = presets.create(
        {
            "name": "x",
            "report_type": "devices",
            "agency_key": 1000,
            "options": {"columns": ["Product", "Serial"]},
        }
    )
    assert created["agency_key"] == "1000"
    assert created["options"] == {"columns": ["Product", "Serial"]}


def test_blank_name_is_rejected(temp_db):
    with pytest.raises(ValueError, match="name"):
        presets.create({"name": "   ", "report_type": "sla", "agency_key": None, "options": {}})


def test_update_revalidates_and_rejects_a_missing_id(temp_db):
    created = presets.create(
        {"name": "sla", "report_type": "sla", "agency_key": None, "options": {}}
    )
    with pytest.raises(ValueError, match="agency"):
        presets.update(created["id"], {"report_type": "patch"})
    updated = presets.update(created["id"], {"name": "  renamed  "})
    assert updated["name"] == "renamed" and updated["report_type"] == "sla"
    assert [p["id"] for p in presets.list_presets()] == [created["id"]]
    with pytest.raises(LookupError):
        presets.update(created["id"] + 1, {"name": "x"})


def test_show_licenses_must_be_a_bool(temp_db):
    with pytest.raises(ValueError, match="showLicenses"):
        presets.create(
            {
                "name": "x",
                "report_type": "office_windows",
                "agency_key": "1000",
                "options": {"showLicenses": "yes"},
            }
        )


def test_annual_companies_must_be_a_list_of_names(temp_db):
    with pytest.raises(ValueError, match="companies"):
        presets.create(
            {
                "name": "x",
                "report_type": "annual_utilization",
                "agency_key": None,
                "options": {"companies": "Harbor Point Health"},
            }
        )
    with pytest.raises(ValueError, match="companies"):
        presets.create(
            {
                "name": "x",
                "report_type": "annual_utilization",
                "agency_key": None,
                "options": {"companies": ["Harbor Point Health", 7]},
            }
        )


def test_annual_rates_must_map_names_to_numbers_or_strings(temp_db):
    for bad in (["150"], {"Tier 1": None}, {"Tier 1": [150]}, {3: 150}):
        with pytest.raises(ValueError, match="rates"):
            presets.create(
                {
                    "name": "x",
                    "report_type": "annual_utilization",
                    "agency_key": None,
                    "options": {"rates": bad},
                }
            )
    created = presets.create(
        {
            "name": "x",
            "report_type": "annual_utilization",
            "agency_key": None,
            "options": {
                "companies": ["A"],
                "rates": {"Tier 1": 150, "Tier 2": 95.5, "Tier 3": "80"},
            },
        }
    )
    assert created["options"] == {
        "companies": ["A"],
        "rates": {"Tier 1": 150, "Tier 2": 95.5, "Tier 3": "80"},
    }


def test_delete_is_refused_while_a_schedule_references_the_preset(temp_db):
    from repositories import schedules

    created = presets.create({"name": "sla", "report_type": "sla", "agency_key": None})
    sid = schedules.insert(
        {
            "preset_id": created["id"],
            "day_of_month": 1,
            "hour": 7,
            "recipients_to": ["a@example.com"],
            "recipients_cc": [],
            "subject": "s",
            "body": "",
            "enabled": True,
            "next_run_at": None,
        }
    )
    with pytest.raises(ValueError, match="schedules"):
        presets.delete(created["id"])
    assert presets.get(created["id"]) is not None

    schedules.delete(sid)
    presets.delete(created["id"])
    assert presets.get(created["id"]) is None


def test_report_types_match_the_renderer(temp_db):
    assert set(presets.REPORT_TYPES) == {
        "devices",
        "sla",
        "quarterly_utilization",
        "annual_utilization",
        "hdd_tickets",
        "office_windows",
        "patch",
    }
