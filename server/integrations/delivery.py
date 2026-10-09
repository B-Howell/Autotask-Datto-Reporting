"""Hand a finished report to the mail flow.

Delivery is a Power Automate flow with an HTTP trigger: the app posts one JSON
message and the flow sends the email from the organisation's mailbox. The
app never holds mail credentials; the flow URL is the only secret, so nothing
in this module logs it or puts it in an error message.
"""

import base64
from dataclasses import dataclass
from urllib.parse import urlsplit

import requests

from config import settings

# The flow accepts the request as soon as it has the body; a large attachment
# is mostly upload time.
TIMEOUT = 60


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
        raise DeliveryError(f"Delivery flow returned {response.status_code}: {response.text[:500]}")
