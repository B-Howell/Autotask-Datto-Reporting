"""Vendor credentials over HTTP: what the Settings page shows, tests and saves.

No route ever returns a stored value; the page sees each field's source and
the tail of a secret, and proves a value by testing it against the vendor.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import settings
from core import secrets
from routers.common import call_or_http_error
from services import connection_tests, credentials

router = APIRouter(prefix="/api/credentials", tags=["credentials"])

DEMO_MODE_DETAIL = "Demo mode simulates the vendor clients"


class CredentialValues(BaseModel):
    """`{field name: value}`; a blank value means "keep what is stored"."""

    values: dict[str, str]


def _refuse_in_demo_mode():
    # Demo mode never reaches a vendor, so a test would be meaningless and a
    # save would store keys nothing uses.
    if settings.demo_mode:
        raise HTTPException(status_code=409, detail=DEMO_MODE_DETAIL)


def _overview():
    return {
        "demoMode": settings.demo_mode,
        "keySource": secrets.key_source(),
        "fields": credentials.status(),
    }


@router.get("")
def credentials_status():
    return call_or_http_error(_overview)


@router.post("/test")
def test_credentials(body: CredentialValues):
    """Probe both vendors with the submitted values over the stored ones; nothing is saved."""
    _refuse_in_demo_mode()
    return call_or_http_error(lambda: connection_tests.test_connection(body.values))


@router.put("")
def save_credentials(body: CredentialValues):
    """Save the submitted values once every vendor they change accepts them."""
    _refuse_in_demo_mode()
    return call_or_http_error(lambda: connection_tests.save_tested(body.values))
