"""Where the vendor clients get their credentials: a source registered at startup.

The integrations sit below the services, yet the values they need are
resolved by the credentials service, a layer above them. Rather than import
upward, they read this registry, and the composition root (`main.py`) hands
it the service before the app is built; the test suite does the same once
per session. Nothing here knows how a value is resolved or stored.

The registered source is duck-typed. It must provide:

- `current()`: `{field name: value}` for every field, `""` when blank;
- `require(vendor)`: the same dict, raising when any field of `vendor` is blank;
- `on_change(callback)`: run the no-argument `callback` after the values change;
- `api_base_for(platform)`: the Datto REST base for a platform label;
- `datto_api_base()`: `api_base_for` of the platform in effect.

Every function below forwards to the registered source and raises
`RuntimeError("No credential source registered")` while there is none, so a
client used before the wiring fails with the cause named rather than with a
missing attribute.
"""

AUTOTASK = "autotask"
DATTO = "datto"

_source = None


def register(source):
    """Make `source` the one the vendor clients read; the composition root calls this once."""
    global _source
    _source = source


def _registered():
    if _source is None:
        raise RuntimeError("No credential source registered")
    return _source


def current():
    """Every field's value in effect, from the registered source."""
    return _registered().current()


def require(vendor):
    """The values in effect, or the source's error when a field of `vendor` is blank."""
    return _registered().require(vendor)


def on_change(callback):
    """Run `callback` after the values change; the composition root registers the clients' listeners."""
    _registered().on_change(callback)


def api_base_for(platform):
    """The Datto REST base for a platform label, as the source derives it."""
    return _registered().api_base_for(platform)


def datto_api_base():
    """The Datto REST base for the platform in effect."""
    return _registered().datto_api_base()
