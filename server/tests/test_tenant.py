import json

from fastapi.testclient import TestClient

from main import app
from services import tenant


def test_defaults_apply_when_there_is_no_file(tmp_path, monkeypatch):
    monkeypatch.setattr(tenant, "TENANT_FILE", str(tmp_path / "tenant.json"))
    data = tenant.get_tenant()
    assert data["groups"] == []
    assert data["firstReportYear"] == 2024
    assert [d["department"] for d in data["ratedDepartments"]][0] == "Administration"


def test_file_values_are_merged_over_defaults(tmp_path, monkeypatch):
    path = tmp_path / "tenant.json"
    path.write_text(
        json.dumps(
            {
                "firstReportYear": 2021,
                "groups": [{"name": "Northfield", "matchPrefix": "Northfield "}],
            }
        )
    )
    monkeypatch.setattr(tenant, "TENANT_FILE", str(path))
    data = tenant.get_tenant()
    assert data["firstReportYear"] == 2021
    assert data["groups"][0]["name"] == "Northfield"
    assert data["earliestQuarterYear"] == 2023


def test_group_members_resolve_by_prefix(tmp_path, monkeypatch):
    path = tmp_path / "tenant.json"
    path.write_text(json.dumps({"groups": [{"name": "Northfield", "matchPrefix": "Northfield "}]}))
    monkeypatch.setattr(tenant, "TENANT_FILE", str(path))
    agencies = [
        {"id": 1, "site": "a", "name": "Northfield Schools"},
        {"id": 2, "site": "b", "name": "Northfield Library"},
        {"id": 3, "site": "c", "name": "Harbor Point"},
    ]
    monkeypatch.setattr(tenant, "get_agencies", lambda: agencies)
    members, name = tenant.resolve_agency("group:Northfield")
    assert [m["id"] for m in members] == [1, 2] and name == "Northfield"
    members, name = tenant.resolve_agency("3")
    assert members == [agencies[2]] and name == "Harbor Point"


def test_logo_route_refuses_paths_outside_the_logo_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(tenant, "LOGO_DIR", str(tmp_path))
    with TestClient(app) as client:
        assert client.get("/api/tenant/logos/..%2Ftenant.json").status_code in (400, 404)
        assert client.get("/api/tenant/logos/missing.png").status_code == 404
