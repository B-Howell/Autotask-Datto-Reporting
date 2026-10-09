"""Hand a finished report to the mail flow.

Delivery is a Power Automate flow with an HTTP trigger: the app posts one JSON
message and the flow sends the email from the organisation's mailbox. The
app never holds mail credentials; the flow URL is the only secret, so nothing
in this module logs it or puts it in an error message.
"""

import base64
import re
from dataclasses import dataclass
from urllib.parse import urlsplit

import requests

from config import settings

# A `requests` timeout is per socket operation: it bounds the wait for the
# flow's answer after the body has gone out, not the upload of the body.
TIMEOUT = 60
# How much of a refusal is kept on the run record.
ERROR_TEXT_LIMIT = 300


class DeliveryError(RuntimeError):
    """Delivery is not configured, the flow is unreachable, or it refused the message."""


@dataclass(frozen=True)
class Attachment:
    name: str
    content: bytes
    content_type: str


def message(to, cc, subject, body, attachments):
    """The exact JSON the flow's trigger schema declares (see the operations doc)."""
    return {
        "to": list(to),
        "cc": list(cc or []),
        "subject": subject,
        "body": body,
        "attachments": [
            {
                "name": a.name,
                "contentType": a.content_type,
                "contentBytes": base64.b64encode(a.content).decode("ascii"),
            }
            for a in attachments
        ],
    }


def _reason(response):
    """The flow's own error message when the body has one, else the trimmed text.

    Power Automate refusals are `{"error": {"code", "message"}}`; anything
    else (a gateway's HTML page, say) is collapsed to one line and capped so
    the stored error stays readable.
    """
    try:
        message_text = response.json()["error"]["message"]
        if isinstance(message_text, str):
            return message_text
    except (ValueError, KeyError, TypeError):
        pass
    return re.sub(r"\s+", " ", response.text).strip()[:ERROR_TEXT_LIMIT]


def send(to, cc, subject, body, attachments):
    """Posts one message to the flow; any 2xx means the flow accepted it."""
    url = settings.delivery_webhook_url
    if not url:
        raise DeliveryError("DELIVERY_WEBHOOK_URL is not set; see server/.env.example")
    try:
        response = requests.post(
            url, json=message(to, cc, subject, body, attachments), timeout=TIMEOUT
        )
    except requests.RequestException as exc:
        # The exception text quotes the request URL, signature included, so
        # only the host and the kind of failure are passed on.
        raise DeliveryError(
            f"Delivery flow unreachable at {urlsplit(url).hostname}: {type(exc).__name__}"
        ) from exc
    if response.status_code >= 300:
        raise DeliveryError(f"Delivery flow returned {response.status_code}: {_reason(response)}")
