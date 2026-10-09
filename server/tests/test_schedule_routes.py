import dataclasses

from fastapi.testclient import TestClient

from config import settings
from integrations import delivery, renderer
from main import app
from repositories import schedules as schedule_repo
from services import schedule_runner


def _preset(client, name="SLA monthly"):
    return client.post(
        "/api/presets", json={"name": name, "report_type": "sla", "options": {}}
    ).json()


def _schedule(client, preset_id):
    return client.post(
        "/api/schedules",
        json={
            "preset_id": preset_id,
            "day_of_month": 1,
            "hour": 7,
            "recipients_to": ["a@example.com"],
            "subject": "{report} {period}",
        },
    ).json()


def test_preset_and_schedule_lifecycle_over_http(temp_db):
    with TestClient(app) as client:
        bad = client.post("/api/presets", json={"name": "x", "report_type": "nope"})
        assert bad.status_code == 400 and "report type" in bad.json()["detail"]

        created = client.post(
            "/api/presets", json={"name": "SLA monthly", "report_type": "sla", "options": {}}
        )
        assert created.status_code == 201
        preset = created.json()
        assert client.get("/api/presets").json() == [preset]
        renamed = client.put(f"/api/presets/{preset['id']}", json={"name": "SLA, monthly"})
        assert renamed.json()["name"] == "SLA, monthly"
        assert client.put("/api/presets/999", json={"name": "x"}).status_code == 404

        posted = client.post(
            "/api/schedules",
            json={
                "preset_id": preset["id"],
                "day_of_month": 1,
                "hour": 7,
                "recipients_to": ["a@example.com"],
                "subject": "{report} {period}",
            },
        )
        assert posted.status_code == 201
        schedule = posted.json()
        assert schedule["preset"]["name"] == "SLA, monthly" and schedule["next_run_at"]

        listed = client.get("/api/schedules").json()
        assert [s["id"] for s in listed] == [schedule["id"]]

        toggled = client.put(f"/api/schedules/{schedule['id']}", json={"enabled": False}).json()
        assert toggled["enabled"] is False and toggled["next_run_at"] is None
        assert toggled["preset"]["id"] == preset["id"]

        invalid = client.put(f"/api/schedules/{schedule['id']}", json={"hour": 24})
        assert invalid.status_code == 400 and "hour" in invalid.json()["detail"]
        assert client.put("/api/schedules/999", json={"hour": 1}).status_code == 404

        assert client.get(f"/api/schedules/{schedule['id']}/runs").json() == []
        assert client.delete(f"/api/presets/{preset['id']}").status_code == 409
        assert client.delete(f"/api/schedules/{schedule['id']}").json() == {"deleted": True}
        assert client.delete(f"/api/presets/{preset['id']}").json() == {"deleted": True}
        assert client.get("/api/schedules").json() == []


def test_run_now_starts_a_run_or_reports_why_not(temp_db, monkeypatch):
    started = []
    monkeypatch.setattr(schedule_runner.runner, "run_now", lambda sid: started.append(sid) or True)
    with TestClient(app) as client:
        schedule = _schedule(client, _preset(client)["id"])
        accepted = client.post(f"/api/schedules/{schedule['id']}/run")
        assert accepted.status_code == 202 and accepted.json() == {"started": True}
        assert started == [schedule["id"]]

        monkeypatch.setattr(schedule_runner.runner, "run_now", lambda sid: False)
        busy = client.post(f"/api/schedules/{schedule['id']}/run")
        assert busy.status_code == 409 and "in flight" in busy.json()["detail"]

        assert client.post("/api/schedules/999/run").status_code == 404


def test_status_reports_the_runner(temp_db, monkeypatch):
    monkeypatch.setattr(
        schedule_runner.runner, "status", lambda: {"running": True, "schedule_id": 3}
    )
    with TestClient(app) as client:
        assert client.get("/api/schedules/status").json() == {"running": True, "schedule_id": 3}


def test_recent_runs_are_listed_across_schedules(temp_db):
    with TestClient(app) as client:
        preset_id = _preset(client)["id"]
        first = _schedule(client, preset_id)["id"]
        second = _schedule(client, preset_id)["id"]
        schedule_repo.insert_run(first, trigger="schedule")
        rid = schedule_repo.insert_run(second, trigger="manual")
        schedule_repo.finish_run(rid, status="ok", saved_report_id=4)

        runs = client.get("/api/schedules/runs").json()
        assert [r["schedule_id"] for r in runs] == [second, first]
        assert runs[0]["status"] == "ok" and runs[0]["saved_report_id"] == 4
        assert client.get("/api/schedules/runs", params={"limit": 1}).json() == runs[:1]
        assert [r["schedule_id"] for r in client.get(f"/api/schedules/{first}/runs").json()] == [
            first
        ]


def test_test_delivery_reports_a_missing_webhook_and_sends_when_configured(temp_db, monkeypatch):
    monkeypatch.setattr(
        delivery, "settings", dataclasses.replace(settings, delivery_webhook_url="")
    )
    with TestClient(app) as client:
        unset = client.post("/api/schedules/test-delivery", json={"to": ["a@example.com"]})
        assert unset.status_code == 502
        assert "DELIVERY_WEBHOOK_URL" in unset.json()["detail"]

        sent = {}
        monkeypatch.setattr(delivery, "send", lambda **k: sent.update(k))
        ok = client.post("/api/schedules/test-delivery", json={"to": ["a@example.com"]})
        assert ok.status_code == 200 and ok.json() == {"sent": True}
        assert sent["to"] == ["a@example.com"] and sent["cc"] == []
        assert sent["subject"] == "Reporting: delivery test"
        assert sent["attachments"] == [] and "\n" not in sent["body"] and sent["body"]

        assert client.post("/api/schedules/test-delivery", json={}).status_code == 422


def test_renderer_health_is_passed_through_or_a_502(temp_db, monkeypatch):
    monkeypatch.setattr(renderer, "health", lambda: {"ok": True, "reportTypes": ["sla"]})
    with TestClient(app) as client:
        assert client.get("/api/schedules/renderer-health").json() == {
            "ok": True,
            "reportTypes": ["sla"],
        }

        def down():
            raise renderer.RenderError("Renderer unreachable at http://renderer:3100: refused")

        monkeypatch.setattr(renderer, "health", down)
        response = client.get("/api/schedules/renderer-health")
        assert response.status_code == 502
        assert "unreachable" in response.json()["detail"]
