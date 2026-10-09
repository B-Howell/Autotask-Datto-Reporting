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
