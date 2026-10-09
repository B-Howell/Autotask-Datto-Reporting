import base64
import dataclasses
import json

import pytest
import requests

from config import settings
from integrations import delivery


class FakeResponse:
    def __init__(self, status, text=""):
        self.status_code = status
        self.text = text

    def json(self):
        return json.loads(self.text)


def _webhook(monkeypatch, url):
    monkeypatch.setattr(
        delivery, "settings", dataclasses.replace(settings, delivery_webhook_url=url)
    )


def test_send_posts_the_message_shape_the_flow_expects(monkeypatch):
    _webhook(monkeypatch, "https://flow.example/x")
    seen = {}
    monkeypatch.setattr(
        delivery.requests,
        "post",
        lambda url, json, timeout: (
            seen.update(url=url, json=json, timeout=timeout) or FakeResponse(202)
        ),
    )
    delivery.send(
        to=["a@example.com"],
        cc=[],
        subject="S",
        body="B",
        attachments=[delivery.Attachment("f.xlsx", b"PK", "application/x")],
    )
    assert seen["url"] == "https://flow.example/x"
    assert seen["timeout"] == delivery.TIMEOUT
    assert seen["json"] == {
        "to": ["a@example.com"],
        "cc": [],
        "subject": "S",
        "body": "B",
        "attachments": [
            {
                "name": "f.xlsx",
                "contentType": "application/x",
                "contentBytes": base64.b64encode(b"PK").decode(),
            }
        ],
    }


def test_message_treats_a_missing_cc_list_as_empty_and_copies_the_lists():
    to = ("a@example.com",)
    out = delivery.message(to, None, "S", "B", [])
    assert out == {
        "to": ["a@example.com"],
        "cc": [],
        "subject": "S",
        "body": "B",
        "attachments": [],
    }


def test_send_without_a_webhook_is_a_clear_error(monkeypatch):
    _webhook(monkeypatch, "")
    called = []
    monkeypatch.setattr(delivery.requests, "post", lambda *a, **k: called.append(1))
    with pytest.raises(delivery.DeliveryError, match="DELIVERY_WEBHOOK_URL"):
        delivery.send(to=["a@example.com"], cc=[], subject="S", body="B", attachments=[])
    assert called == []


def test_send_reports_a_rejected_request_without_the_url(monkeypatch):
    _webhook(monkeypatch, "https://flow.example/secret-signature")
    monkeypatch.setattr(delivery.requests, "post", lambda *a, **k: FakeResponse(401, "denied"))
    with pytest.raises(delivery.DeliveryError, match="401.*denied") as info:
        delivery.send(to=["a@example.com"], cc=[], subject="S", body="B", attachments=[])
    assert "secret-signature" not in str(info.value)


def test_send_prefers_the_flow_error_message_over_the_raw_body(monkeypatch):
    _webhook(monkeypatch, "https://flow.example/x")
    body = (
        '{"error":{"code":"TriggerInputSchemaMismatch","message":"The input body does not match"}}'
    )
    monkeypatch.setattr(delivery.requests, "post", lambda *a, **k: FakeResponse(400, body))
    with pytest.raises(delivery.DeliveryError, match="400: The input body does not match$"):
        delivery.send(to=["a@example.com"], cc=[], subject="S", body="B", attachments=[])


def test_send_collapses_and_caps_a_body_that_is_not_the_flow_error_shape(monkeypatch):
    _webhook(monkeypatch, "https://flow.example/x")
    html = "<html>\n  <body>\n    Gateway   timeout " + "x" * 400 + "\n</body></html>"
    monkeypatch.setattr(delivery.requests, "post", lambda *a, **k: FakeResponse(504, html))
    with pytest.raises(delivery.DeliveryError) as info:
        delivery.send(to=["a@example.com"], cc=[], subject="S", body="B", attachments=[])
    text = str(info.value)
    assert text.startswith("Delivery flow returned 504: <html> <body> Gateway timeout x")
    assert "\n" not in text and len(text) <= len("Delivery flow returned 504: ") + 300
    monkeypatch.setattr(delivery.requests, "post", lambda *a, **k: FakeResponse(500, '{"a":1}'))
    with pytest.raises(delivery.DeliveryError, match=r"500: \{\"a\":1\}$"):
        delivery.send(to=["a@example.com"], cc=[], subject="S", body="B", attachments=[])


@pytest.mark.parametrize(
    "failure", [requests.ConnectionError, requests.Timeout, requests.ConnectTimeout]
)
def test_send_reports_an_unreachable_flow_without_the_url(monkeypatch, failure):
    _webhook(monkeypatch, "https://flow.example/secret-signature")

    def refuse(*a, **k):
        # A real requests error quotes the request URL, signature and all.
        raise failure("Max retries exceeded with url: /secret-signature")

    monkeypatch.setattr(delivery.requests, "post", refuse)
    with pytest.raises(delivery.DeliveryError, match="unreachable.*flow.example") as info:
        delivery.send(to=["a@example.com"], cc=[], subject="S", body="B", attachments=[])
    assert failure.__name__ in str(info.value)
    assert "secret-signature" not in str(info.value)


def test_attachment_is_immutable():
    attachment = delivery.Attachment("f.xlsx", b"PK", "application/x")
    with pytest.raises(dataclasses.FrozenInstanceError):
        attachment.name = "g.xlsx"
