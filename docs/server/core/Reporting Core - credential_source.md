# Credential source registry

> The one place the vendor clients read their credentials from: a registry that forwards to whatever source the composition root registered, so the integrations never import the service that resolves the values.

## Purpose

The Autotask and Datto clients need the base URL, the keys and the platform before every request, and those are resolved by the [credentials service](<../services/Reporting Service - credentials.md>), a layer above the integrations. Importing upward would make the layering cosmetic, so `core/credential_source.py` sits in the lowest layer and holds a reference to the source instead. [main](<../Reporting Server - main.md>) registers the service before the app is built and registers the two listeners a change must reach; the integrations import only this module. Nothing here knows how a value is resolved, cached, validated or stored.

## Interface

| Name | Description |
|---|---|
| `AUTOTASK`, `DATTO` | The vendor names, `"autotask"` and `"datto"`, defined here because they are part of the contract between the source and the clients; the credentials service imports them from here. |
| `register(source)` | Makes `source` the one every function below forwards to. Called once by the composition root; a second call replaces the source. |
| `current()` | Forwards to `source.current()`: `{field name: value}` for every field, `""` when blank. |
| `require(vendor)` | Forwards to `source.require(vendor)`: the values in effect, or the source's own error (the service raises `CredentialsMissing`) when a field of the vendor is blank. |
| `on_change(callback)` | Forwards to `source.on_change(callback)`: runs the no-argument callable after the values change. |
| `api_base_for(platform)` | Forwards to `source.api_base_for(platform)`: the Datto REST base for a platform label. |
| `datto_api_base()` | Forwards to `source.datto_api_base()`: the REST base for the platform in effect. |

The source is duck-typed: anything with those five methods can be registered, which is how the test for this module proves the forwarding with a plain class. Every forwarding function raises `RuntimeError("No credential source registered")` while nothing is registered, so a client used before the wiring fails naming the cause rather than with a missing attribute.

## Uses

- Nothing: the module has no imports, which is what lets the integrations depend on it without pulling in a service.

## Used By

- [autotask integration](<../integrations/Reporting Integration - autotask.md>) (`require(AUTOTASK)` before every request).
- [datto integration](<../integrations/Reporting Integration - datto.md>) (`require(DATTO)` when a token is fetched, `api_base_for` for the token URL, `datto_api_base` per request).
- [credentials service](<../services/Reporting Service - credentials.md>) imports `AUTOTASK` and `DATTO` and is the source [main](<../Reporting Server - main.md>) registers, through `wire_vendor_clients()`, together with the listeners `autotask().forget_picklists` and `datto.forget_token`.
- [server/tests/conftest.py](../../../server/tests/conftest.py) imports `main` in a session-wide autouse fixture so the suite has the same wiring; [server/tests/test_core.py](../../../server/tests/test_core.py) covers the unregistered error and the forwarding.

## Key Behavior

- Registration is a plain module variable, not a lock or a once-only guard: the composition root calls `register` at import, before any request can run, and a test may swap the source under `monkeypatch` to prove the unregistered error. There is no `unregister`; a test restores the attribute through `monkeypatch`.
- The listeners are registered by the composition root rather than by the integrations at import, because `on_change` only works once a source exists and the integrations are imported before `main` registers one. Keeping both registrations next to `register` in `main.wire_vendor_clients()` means the wiring reads in one place and an import of an integration has no side effect on the service.
- The protocol lists `api_base_for` and `datto_api_base` but no token URL: the OAuth path is the Datto client's own knowledge, so `datto.token_url_for` appends it to `api_base_for`.
- The check that the inversion holds is mechanical: `git grep "from services" server/integrations` is empty, and importing `integrations.autotask` and `integrations.datto` in a fresh interpreter loads no `services.*` module.

## Cleanup Notes

- The registry forwards five methods by hand. A `__getattr__` forwarder would be shorter, but the explicit functions are the documented protocol and keep an unregistered source's error on every call site.

## Source

[server/core/credential_source.py](../../../server/core/credential_source.py)
