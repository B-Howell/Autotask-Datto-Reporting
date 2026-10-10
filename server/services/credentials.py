"""Vendor credentials: the environment first, then the encrypted store.

Each field has an environment variable and a row in the `credentials` table.
A non-blank variable always wins and cannot be edited in the app, so a
deployment that injects its secrets keeps control of them; everything else is
entered on the Settings page and stored encrypted. The resolved values are
cached here, and `invalidate()` tells the registered listeners (the vendor
clients) to drop anything they derived from the old values.
"""

import os
import re
import threading
from dataclasses import dataclass

from core import secrets
from repositories import credentials as repo

AUTOTASK = "autotask"
DATTO = "datto"

SOURCE_ENVIRONMENT = "environment"
SOURCE_STORED = "stored"
SOURCE_MISSING = "missing"


@dataclass(frozen=True)
class Field:
    env: str
    secret: bool
    vendor: str


FIELDS = {
    "autotask_username": Field("AUTOTASK_USERNAME", secret=False, vendor=AUTOTASK),
    "autotask_secret": Field("AUTOTASK_PASSWORD", secret=True, vendor=AUTOTASK),
    "autotask_integration_code": Field("AUTOTASK_TRACKING_ID", secret=True, vendor=AUTOTASK),
    "autotask_base_url": Field("AUTOTASK_BASE_URL", secret=False, vendor=AUTOTASK),
    "datto_api_key": Field("DATTO_API_KEY", secret=True, vendor=DATTO),
    "datto_api_secret": Field("DATTO_API_SECRET", secret=True, vendor=DATTO),
    "datto_platform": Field("DATTO_PLATFORM", secret=False, vendor=DATTO),
}

# A Datto platform is the first label of the hostname you sign in to.
_PLATFORM = re.compile(r"^[a-z0-9-]+$")
_HTTPS = "https://"
_HINT_LENGTH = 4

_lock = threading.Lock()
_values = None
_listeners = []


def _field(name):
    try:
        return FIELDS[name]
    except KeyError:
        raise ValueError(f"Unknown credential: {name}") from None


def _names_for(vendor):
    return [name for name, field in FIELDS.items() if field.vendor == vendor]


def _env_value(field):
    return os.environ.get(field.env, "").strip()


def _stored_value(rows, name):
    return secrets.decrypt(rows[name]["ciphertext"]) if name in rows else ""


def _resolve():
    rows = repo.get_all()
    return {name: _env_value(field) or _stored_value(rows, name) for name, field in FIELDS.items()}


def current():
    """Every field's value in effect: the environment, else the store, else ""."""
    global _values
    with _lock:
        if _values is None:
            _values = _resolve()
        return dict(_values)


def on_change(callback):
    """Register a no-argument callable to run after the values change."""
    _listeners.append(callback)


def invalidate():
    """Forget the cached values and tell every listener to do the same."""
    global _values
    with _lock:
        _values = None
    for callback in _listeners:
        callback()


def _source(field, name, rows):
    if _env_value(field):
        return SOURCE_ENVIRONMENT
    return SOURCE_STORED if name in rows else SOURCE_MISSING


def _hint(field, value):
    """The tail of a secret so the page can tell which one is in place, never the whole thing."""
    if not field.secret or len(value) <= _HINT_LENGTH:
        return ""
    return value[-_HINT_LENGTH:]


def _entry(name, field, value, rows):
    row = rows.get(name, {})
    return {
        "name": name,
        "vendor": field.vendor,
        "secret": field.secret,
        "configured": bool(value),
        "source": _source(field, name, rows),
        "last4": _hint(field, value),
        "updated_at": row.get("updated_at"),
        "last_tested_at": row.get("last_tested_at"),
        "last_test_ok": row.get("last_test_ok"),
    }


def status():
    """One entry per field for the Settings page; no entry carries a full value."""
    values = current()
    rows = repo.get_all()
    return [_entry(name, field, values[name], rows) for name, field in FIELDS.items()]


def _base_url(value):
    value = value.rstrip("/")
    if not value.startswith(_HTTPS):
        raise ValueError(f"The Autotask base URL must start with {_HTTPS}")
    return value


def _platform(value):
    if not _PLATFORM.match(value):
        raise ValueError("The Datto platform is the first label of the host you sign in to")
    return value


_VALIDATORS = {"autotask_base_url": _base_url, "datto_platform": _platform}


def _validated(name, value):
    validate = _VALIDATORS.get(name)
    return validate(value) if validate else value


def _accept(name, raw):
    """The cleaned value to store for `name`, or None when it is to be left alone."""
    field = _field(name)
    value = (raw or "").strip()
    if not value:
        return None
    if _env_value(field):
        raise ValueError(
            f"{field.env} is set by the environment; clear it to manage this value here"
        )
    return _validated(name, value)


def save(values):
    """Store the non-blank entries after validating all of them; blanks keep what is stored."""
    accepted = {name: _accept(name, raw) for name, raw in values.items()}
    for name, value in accepted.items():
        if value is not None:
            repo.upsert(name, secrets.encrypt(value))
    invalidate()


def record_test(vendor, ok):
    repo.record_test(_names_for(vendor), ok)


def is_configured(vendor):
    values = current()
    return all(values[name] for name in _names_for(vendor))


def datto_api_base():
    return f"{_HTTPS}{current()['datto_platform']}-api.centrastage.net"


def datto_token_url():
    return f"{datto_api_base()}/auth/oauth/token"
