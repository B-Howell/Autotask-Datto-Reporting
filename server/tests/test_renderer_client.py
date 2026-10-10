import dataclasses
import json

import pytest
import requests

from config import settings
from integrations import renderer


class FakeResponse:
    def __init__(self, status, content=b"", headers=None, text=""):
        self.status_code = status
        self.content = content
        self.headers = headers or {}
        self.text = text

    def json(self):
        return json.loads(self.text)


def _at(monkeypatch, url):
    monkeypatch.setattr(renderer, "settings", dataclasses.replace(settings, renderer_url=url))


def test_render_posts_the_request_and_returns_bytes(monkeypatch):
    _at(monkeypatch, "http://renderer.example:3100")
    seen = {}

    def fake_post(url, json, timeout):
        seen.update(url=url, json=json, timeout=timeout)
        return FakeResponse(200, b"PK..", {"content-type": "application/x"})

    monkeypatch.setattr(renderer.requests, "post", fake_post)
    out = renderer.render("devices", {"a": 1}, {"columns": []}, "f.xlsx", logo_base64=None)
    assert out == (b"PK..", "application/x")
    assert seen["url"] == "http://renderer.example:3100/render"
    assert seen["json"] == {
        "reportType": "devices",
        "data": {"a": 1},
        "options": {"columns": []},
        "filename": "f.xlsx",
        "logoBase64": None,
    }
    assert seen["timeout"] == renderer.TIMEOUT


def test_render_sends_an_empty_options_object_for_none(monkeypatch):
    seen = {}
    monkeypatch.setattr(
        renderer.requests,
        "post",
        lambda url, json, timeout: seen.update(json=json) or FakeResponse(200, b"x"),
    )
    renderer.render("sla", {}, None, "f.xlsx")
    assert seen["json"]["options"] == {}


def test_render_defaults_the_content_type_when_the_header_is_missing(monkeypatch):
    monkeypatch.setattr(renderer.requests, "post", lambda *a, **k: FakeResponse(200, b"x"))
    assert renderer.render("sla", {}, {}, "f.xlsx") == (b"x", "application/octet-stream")


def test_render_errors_carry_the_renderer_message(monkeypatch):
    monkeypatch.setattr(
        renderer.requests,
        "post",
        lambda *a, **k: FakeResponse(400, text='{"error":"Unknown report type: x"}'),
    )
    with pytest.raises(renderer.RenderError, match="400.*Unknown report type"):
        renderer.render("x", {}, {}, "f")


def test_render_unreachable_names_the_renderer_url(monkeypatch):
    _at(monkeypatch, "http://renderer.example:3100")

    def refuse(*a, **k):
        raise requests.ConnectionError("refused")

    monkeypatch.setattr(renderer.requests, "post", refuse)
    with pytest.raises(renderer.RenderError, match="unreachable.*http://renderer.example:3100"):
        renderer.render("sla", {}, {}, "f")


def test_health_returns_the_parsed_body(monkeypatch):
    _at(monkeypatch, "http://renderer.example:3100")
    seen = {}

    def fake_get(url, timeout):
        seen.update(url=url, timeout=timeout)
        return FakeResponse(200, text='{"ok":true,"reportTypes":["sla"]}')

    monkeypatch.setattr(renderer.requests, "get", fake_get)
    assert renderer.health() == {"ok": True, "reportTypes": ["sla"]}
    assert seen["url"] == "http://renderer.example:3100/health"


def test_health_raises_when_the_renderer_is_down_or_unhappy(monkeypatch):
    def refuse(*a, **k):
        raise requests.ConnectionError("refused")

    monkeypatch.setattr(renderer.requests, "get", refuse)
    with pytest.raises(renderer.RenderError, match="unreachable"):
        renderer.health()
    monkeypatch.setattr(renderer.requests, "get", lambda *a, **k: FakeResponse(500, text="boom"))
    with pytest.raises(renderer.RenderError, match="500"):
        renderer.health()


def test_health_rejects_a_body_that_is_not_json(monkeypatch):
    """A proxy's HTML error page with a 200 is a renderer fault, not a 400 to the caller."""
    monkeypatch.setattr(
        renderer.requests, "get", lambda *a, **k: FakeResponse(200, text="<html>ok</html>")
    )
    with pytest.raises(renderer.RenderError, match="not JSON"):
        renderer.health()
