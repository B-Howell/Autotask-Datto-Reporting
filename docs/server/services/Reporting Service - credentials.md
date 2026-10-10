# Credentials service

> Resolves each vendor credential from the environment first and the encrypted store second, validates what the Settings page saves, tests submitted or stored values against the vendors through throwaway clients, and tells the vendor clients when the values change.

## Purpose

The Autotask and Datto clients need a username, secrets and a hostname. Until now those came only from environment variables, so rotating a key meant a redeploy. This module lets them be entered in the app instead while keeping a deployment that injects its secrets in charge: a non-blank environment variable always wins and cannot be edited on the page, everything else is stored encrypted through [secrets](<../core/Reporting Core - secrets.md>) in the [credentials repository](<../repositories/Reporting Repository - credentials.md>). The resolved values are cached once per process, and `invalidate()` notifies registered listeners so a client that derived something from the old values (the Datto token provider, for one) can drop it.

The seven fields carry the same variable names [config](<../Reporting Server - config.md>) once loaded, so a deployment that already sets them sees no change in behaviour. The vendor integrations read this module at call time, so config no longer holds the values and nothing is required at startup.

A connection test builds throwaway vendor clients from the submitted values laid over the stored ones, through the injection points the integrations expose, so the Settings page can prove a key before it is saved and prove that the stored keys still work. A save through `save_tested` is that test followed by the write, and a vendor that refuses the values it was given blocks the save.

## Interface

| Name | Description |
|---|---|
| `Field(env, secret, vendor)` | Frozen dataclass describing one field: its environment variable, whether the Settings page must mask it, and the vendor it belongs to (`AUTOTASK` or `DATTO`). |
| `Resolved(value, source)` | Frozen dataclass holding one field's value in effect and which source supplied it, decided together in one pass so `configured`, `last4` and `source` can never disagree. |
| `FIELDS` | Map of field name to `Field`: `autotask_username` (`AUTOTASK_USERNAME`), `autotask_secret` (`AUTOTASK_PASSWORD`, secret), `autotask_integration_code` (`AUTOTASK_TRACKING_ID`, secret), `autotask_base_url` (`AUTOTASK_BASE_URL`), `datto_api_key` (`DATTO_API_KEY`, secret), `datto_api_secret` (`DATTO_API_SECRET`, secret), `datto_platform` (`DATTO_PLATFORM`). |
| `AUTOTASK`, `DATTO` | The vendor names. |
| `SOURCE_ENVIRONMENT`, `SOURCE_STORED`, `SOURCE_MISSING` | The three values of `source` in a status entry. |
| `current()` | `{name: value}` for every field: the trimmed environment value when non-blank, else the decrypted stored value, else `""`. Cached; returns a copy. |
| `status()` | One dict per field for the Settings page: `name`, `vendor`, `secret`, `configured`, `source`, `last4`, `updated_at`, `last_tested_at`, `last_test_ok`. Never carries a full value. |
| `save(values)` | Validates every entry, then stores the non-blank ones encrypted in one transaction and calls `invalidate()`; when every entry is blank nothing is written and no listener runs. Raises `ValueError` and writes nothing when any entry is unknown, environment-managed or malformed. |
| `merged(values)` | `current()` with the non-blank entries of `values` laid over it, after the same validation as `save` (so an unknown name or an environment-managed field raises `ValueError`). Nothing is stored. |
| `test_connection(values)` | `{"autotask": {ok, message}, "datto": {ok, message}}` after probing both vendors with `merged(values)`; records each probed vendor's outcome with `record_test`. The message is `Connected`, the integration's failure text with every secret value blanked, or `<Vendor> credentials are incomplete` when a field of that vendor is still blank, in which case no request is made and nothing is recorded for it. |
| `save_tested(values)` | Runs the same probes, raises `ConnectionTestFailed` naming the first changed vendor (in name order) that did not pass, otherwise stores the values as `save` would, records the outcomes and returns `status()`. |
| `ConnectionTestFailed` | `ValueError` subclass: a vendor refused the values submitted for it, so nothing was saved. The message is `<Vendor> refused the credentials: <message>` or `<Vendor> credentials are incomplete`. |
| `PROBE_TIMEOUT_SECONDS` | 15: the timeout of the throwaway clients, so a Settings page test gives up well before a report would. |
| `invalidate()` | Drops the cached values and runs every registered listener. |
| `on_change(callback)` | Registers a no-argument callable to run after `invalidate()`. |
| `record_test(vendor, ok)` | Stamps the outcome of a connection test on that vendor's stored rows. |
| `is_configured(vendor)` | True when every field of the vendor has a non-blank value in `current()`. |
| `require(vendor)` | `current()` when every field of the vendor is set, else `CredentialsMissing` (`<Vendor> credentials are not configured; open Settings`). The integrations call it before a request and read the values it returns. |
| `require_all(vendors)` | `current()` when every listed vendor is set, else one `CredentialsMissing` naming each vendor that is not (`Autotask and Datto credentials are not configured; open Settings`). `require` is `require_all` of one vendor. |
| `CredentialsMissing` | `RuntimeError` subclass: a vendor call was attempted while one of its credentials is blank. |
| `api_base_for(platform)`, `token_url_for(platform)` | `https://<platform>-api.centrastage.net` and `<base>/auth/oauth/token` for any platform label, exactly as config once derived them from `DATTO_PLATFORM`; the Datto integration builds every token request with `token_url_for`, from stored or not yet stored values alike. |
| `datto_api_base()` | `api_base_for` of the current `datto_platform`, the URL root the Datto client reads per request. |

Validation failures raise `ValueError` with a message meant for the user: `Unknown credential: <name>`, `<VARIABLE> is set by the environment; clear it to manage this value here`, `The Autotask base URL must start with https://`, `The Datto platform is the first label of the host you sign in to`.

## Uses

- [secrets](<../core/Reporting Core - secrets.md>) for `encrypt` and `decrypt`.
- [credentials repository](<../repositories/Reporting Repository - credentials.md>), imported as `repo`, for `get_all`, `upsert_many` and `record_test`.
- The [autotask](<../integrations/Reporting Integration - autotask.md>) and [datto](<../integrations/Reporting Integration - datto.md>) integrations, imported inside the two probe helpers rather than at load time: both import this module at load time and register listeners as they load, and the throwaway clients are only wanted while a test runs.
- `os.environ`, read directly rather than through `settings`: the `Settings` object is frozen at import, and this module must see a variable that is set or cleared afterwards (the tests vary it per case, and an operator clearing a variable to take over a value in the app expects the next restart to honour that).

## Used By

- [autotask integration](<../integrations/Reporting Integration - autotask.md>) (`require` on every request, `on_change` to drop the picklist cache) and [datto integration](<../integrations/Reporting Integration - datto.md>) (`require` and `token_url_for()` when a token is fetched, `datto_api_base` per request, `on_change` to drop the cached token).
- [routers/common](<../routers/Reporting Router - common.md>) maps `CredentialsMissing` to 503.
- [sync service](<Reporting Service - sync.md>) calls `require_all` for both vendors before starting a live sync.
- [server/tests/test_credentials.py](../../../server/tests/test_credentials.py); the `store` and `configured` fixtures in [server/tests/conftest.py](../../../server/tests/conftest.py) serve every test that needs stored values.
- [credentials router](<../routers/Reporting Router - credentials.md>) (`status` for GET, `test_connection` for the test route, `save_tested` for PUT; its `ConnectionTestFailed` is a 400 through [routers/common](<../routers/Reporting Router - common.md>)).
- The Settings page's credentials form builds on the router in a later change.

## Key Behavior

- Precedence is decided per field, not per vendor: a deployment can inject `DATTO_API_SECRET` and leave the platform to be entered in the app. The environment value is trimmed, and a variable that is set but blank counts as unset.
- One pass decides everything: `_resolve_field` reads the environment, then the store, and returns a `Resolved(value, source)`; the whole map is built on the first call and cached under a lock, and `current()` and `status()` both read that one snapshot, so `configured`, `last4` and `source` describe the same resolution and cannot drift apart between two reads of the environment. Later calls return a copy without touching the environment, the database or the key. Only `invalidate()` clears the cache, so a variable changed in a running process is not seen until something calls `invalidate()` (every `save` that writes does). `secrets.SecretsError` from a stored value that no longer decrypts under the loaded key propagates out of `current()`, `status()` and everything built on them; the test swaps the key file to prove it, and the router maps it when it lands.
- `source` is `environment` when the variable is non-blank, `stored` when the value came from a row, otherwise `missing`. `configured` is simply whether the value is non-blank. Because a blank save never writes a row, a stored row always holds a non-blank value and `stored` always implies `configured`.
- `last4` is the last four characters of a secret field's value, for environment and stored values alike, so the page can tell which key is in place without showing it. It is `""` for non-secret fields, for missing values, and for any secret shorter than twelve characters (`_MIN_HINTED_LENGTH`, three times the hint), so the tail shown is never more than a third of the value. `status()` is the only read path meant for the browser and the test asserts the plaintext never appears in its JSON.
- `save` cleans and validates every entry before the first write, so a request with one bad field stores nothing; the accepted entries are then written through `repo.upsert_many` in one transaction, so a database failure part way leaves every row as it was. When nothing was accepted (every entry blank) `save` returns without writing or notifying, so re-posting an untouched form does not make the vendor clients drop their tokens. An unknown name is refused even when its value is blank. A blank or missing value leaves the stored row alone, which is how a form that re-posts every field without retyping a secret keeps it; it also means a value cannot be cleared through `save`, only replaced (the repository's `delete` exists for that). A non-blank value for a field whose variable is set is refused with the variable's name, so the page can say which one to clear.
- `autotask_base_url` loses any trailing slash and must start with `https://`; `datto_platform` must match `^[a-z0-9-]+$`, which rejects a full hostname or a URL pasted by mistake. Values are stored after cleaning, so `current()` returns them in the shape the clients expect.
- Listeners run outside the lock, after the cache is cleared, so a listener that calls `current()` sees the new values (a test does exactly that). They are iterated over a copy of the list, so a listener that registers another listener while running does not disturb the loop; the new one runs from the next `invalidate()`. They are stored in module state and are registered once at import by the client that needs them.
- `record_test` stamps only the vendor's stored rows; a vendor configured through the environment has no rows to stamp, so its status entries keep `last_tested_at` as `None`.
- A test is the submitted values over the stored ones: `merged` runs every entry through `_accept` (the validators `save` uses) and lays the non-blank results over `current()`, so the form can re-post every field with the secrets left blank and still test what is stored. Both vendors are probed every time, including one whose fields were not touched, because the page wants to know that the stored keys still work; a vendor with a blank field after the merge is reported as incomplete without a request, since the clients would raise `CredentialsMissing` or send a request to a host built from an empty platform.
- The probes go through the integrations' injection points: `AutotaskClient(connection=lambda: connection_from(values))` and `DattoTokenProvider(token_request=lambda: token_request_from(values))`, each with `PROBE_TIMEOUT_SECONDS`, then `autotask.probe` (one `Companies/query` for at most one record) and `datto.probe` (one token fetch). The process-wide clients are never touched, so a failed test cannot disturb a report that is running on the stored values, and the module never sees a URL or header.
- Every message that leaves the service has the secret values blanked: `_probe` hands each integration a redaction (`_without_secrets`, longest value first, replaced with `[hidden]`) that runs over a refusal's whole body before the integration cuts it to 300 characters, so a value straddling the cut cannot leave a fragment. The integrations already keep the URL out of their text, but a vendor's refusal can quote what it was sent; the route tests assert that a refusal body containing the submitted secret, including one placed across the cut, never reaches the response.
- `save_tested` orders its steps so a new row carries its own result: validate, probe, refuse if a changed vendor failed, store, record. Recording before the store would stamp rows that do not exist yet. Only vendors with a non-blank accepted entry can block the save; the other vendor's failure is recorded and reported through `status()` (`last_test_ok` false) but does not stop a rotation of the first vendor's secret.

## Cleanup Notes

- `on_change` has no `off` counterpart and the listener list is never reset outside the tests, which is fine for the one registration per process it is meant for.
- The probes make this module depend on the integrations that depend on it; the in-function imports keep that cycle out of load time. A registry the integrations fill at import, the way they register `on_change` listeners, would remove the cycle altogether.
- A save that is refused records nothing for the untouched vendor, although its probe ran: the refusal is raised before the recording step, so the stored rows keep their previous outcome.

## Source

[server/services/credentials.py](../../../server/services/credentials.py)
