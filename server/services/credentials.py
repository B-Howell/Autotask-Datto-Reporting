"""Vendor credentials: the environment first, then the encrypted store.

Each field has an environment variable and a row in the `credentials` table.
A non-blank variable always wins and cannot be edited in the app, so a
deployment that injects its secrets keeps control of them; everything else is
entered on the Settings page and stored encrypted. The resolved values are
cached here, and `invalidate()` tells the registered listeners (the vendor
clients) to drop anything they derived from the old values. The connection
tests the Settings page runs live in `services/connection_tests.py`, built
on `merged`, `changes` and `complete` from here.
"""

import os
import re
import threading
from dataclasses import dataclass

from core import secrets
from repositories import credentials as repo

AUTOTASK = "autotask"
DATTO = "datto"
VENDOR_LABELS = {AUTOTASK: "Autotask", DATTO: "Datto"}

SOURCE_ENVIRONMENT = "environment"
SOURCE_STORED = "stored"
SOURCE_MISSING = "missing"


@dataclass(frozen=True)
class Field:
    env: str
    secret: bool
    vendor: str


@dataclass(frozen=True)
class Resolved:
    """One field's value in effect and where it came from, decided in one pass."""

    value: str
    source: str


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
# A hint must leave most of the secret unknown: the tail is only shown when
# it is at most a third of the value.
_MIN_HINTED_LENGTH = 3 * _HINT_LENGTH

_lock = threading.Lock()
_resolved_values = None
_listeners = []


class CredentialsMissing(RuntimeError):
    """A vendor call was attempted while one of its credentials is blank."""


def _field(name):
    try:
        return FIELDS[name]
    except KeyError:
        raise ValueError(f"Unknown credential: {name}") from None


def _names_for(vendor):
    return [name for name, field in FIELDS.items() if field.vendor == vendor]


def _env_value(field):
    return os.environ.get(field.env, "").strip()


def _resolve_field(name, field, rows):
    env_value = _env_value(field)
    if env_value:
        return Resolved(env_value, SOURCE_ENVIRONMENT)
    if name in rows:
        return Resolved(secrets.decrypt(rows[name]["ciphertext"]), SOURCE_STORED)
    return Resolved("", SOURCE_MISSING)


def _resolve():
    rows = repo.get_all()
    return {name: _resolve_field(name, field, rows) for name, field in FIELDS.items()}


def _resolved():
    """Every field's `Resolved`, from the cache or one fresh pass over the sources."""
    global _resolved_values
    with _lock:
        if _resolved_values is None:
            _resolved_values = _resolve()
        return dict(_resolved_values)


def current():
    """Every field's value in effect: the environment, else the store, else ""."""
    return {name: resolved.value for name, resolved in _resolved().items()}


def on_change(callback):
    """Register a no-argument callable to run after the values change."""
    _listeners.append(callback)


def invalidate():
    """Forget the cached values and tell every listener to do the same."""
    global _resolved_values
    with _lock:
        _resolved_values = None
    # A copy, so a listener that registers another listener while running
    # does not change the list being iterated.
    for callback in list(_listeners):
        callback()


def _hint(field, value):
    """The tail of a secret so the page can tell which one is in place, never the whole thing."""
    if not field.secret or len(value) < _MIN_HINTED_LENGTH:
        return ""
    return value[-_HINT_LENGTH:]


def _entry(name, field, resolved, row):
    return {
        "name": name,
        "vendor": field.vendor,
        "secret": field.secret,
        "configured": bool(resolved.value),
        "source": resolved.source,
        "last4": _hint(field, resolved.value),
        "updated_at": row.get("updated_at"),
        "last_tested_at": row.get("last_tested_at"),
        "last_test_ok": row.get("last_test_ok"),
    }


def status():
    """One entry per field for the Settings page; no entry carries a full value."""
    resolved = _resolved()
    rows = repo.get_all()
    return [
        _entry(name, field, resolved[name], rows.get(name, {})) for name, field in FIELDS.items()
    ]


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


def _accepted(values):
    """`{name: cleaned value or None}` for every entry, validated before any is used."""
    return {name: _accept(name, raw) for name, raw in values.items()}


def changes(values):
    """`{name: cleaned value}` for the non-blank entries, after validating every entry."""
    return {name: value for name, value in _accepted(values).items() if value is not None}


def _store(cleaned):
    """Write the cleaned changes in one transaction; the listeners are only told of a write."""
    entries = [(name, secrets.encrypt(value)) for name, value in cleaned.items()]
    if not entries:
        return
    repo.upsert_many(entries)
    invalidate()


def save(values):
    """Store the non-blank entries after validating all of them; blanks keep what is stored."""
    _store(changes(values))


def merged(values):
    """`current()` with the non-blank entries of `values` over it, validated as `save` would."""
    return {**current(), **changes(values)}


def record_test(vendor, ok):
    repo.record_test(_names_for(vendor), ok)


def complete(values, vendor):
    """True when every field of the vendor is non-blank in `values`."""
    return all(values[name] for name in _names_for(vendor))


def is_configured(vendor):
    return complete(current(), vendor)


def _not_configured(vendors):
    labels = " and ".join(VENDOR_LABELS[vendor] for vendor in vendors)
    return CredentialsMissing(f"{labels} credentials are not configured; open Settings")


def require_all(vendors):
    """The current values, or one `CredentialsMissing` naming every vendor with a blank field."""
    values = current()
    missing = [vendor for vendor in vendors if not complete(values, vendor)]
    if missing:
        raise _not_configured(missing)
    return values


def require(vendor):
    """The current values, or `CredentialsMissing` when any field of the vendor is blank."""
    return require_all([vendor])


def api_base_for(platform):
    return f"{_HTTPS}{platform}-api.centrastage.net"


def token_url_for(platform):
    return f"{api_base_for(platform)}/auth/oauth/token"


def datto_api_base():
    return api_base_for(current()["datto_platform"])
