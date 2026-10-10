# Credentials service

> Resolves each vendor credential from the environment first and the encrypted store second, validates what the Settings page saves, and tells the vendor clients when the values change.

## Purpose

The Autotask and Datto clients need a username, secrets and a hostname. Until now those came only from environment variables, so rotating a key meant a redeploy. This module lets them be entered in the app instead while keeping a deployment that injects its secrets in charge: a non-blank environment variable always wins and cannot be edited on the page, everything else is stored encrypted through [secrets](<../core/Reporting Core - secrets.md>) in the [credentials repository](<../repositories/Reporting Repository - credentials.md>). The resolved values are cached once per process, and `invalidate()` notifies registered listeners so a client that derived something from the old values (the Datto token provider, for one) can drop it.

The seven fields carry the same variable names [config](<../Reporting Server - config.md>) once loaded, so a deployment that already sets them sees no change in behaviour. The vendor integrations read this module at call time, so config no longer holds the values and nothing is required at startup.

The connection tests the Settings page runs on top of these values live in the [connection_tests service](<Reporting Service - connection_tests.md>), which reads `changes`, `merged_from`, `complete` and `store_changes` from here; this module imports no integration, so the integrations can import it at load time without a cycle.

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
| `changes(values)` | `{name: cleaned value}` for the non-blank entries of `values`, after validating every entry (so an unknown name or an environment-managed field raises `ValueError` even when its value is blank, and a request with one bad field yields nothing to store). Nothing is stored; a save is `changes` followed by `store_changes`. |
| `merged_from(cleaned)` | `current()` with changes already cleaned by `changes` laid over it: the values a test runs with. Lets a caller that needs both the changes and the merge validate once. |
| `forget_stored()` | Deletes every stored row through `repo.delete_all()` and calls `invalidate()`. Nothing is decrypted first, so it works when the rows can no longer be read under the loaded key; environment-sourced values are untouched, and the next `status()` reads every formerly stored field as `missing`. |
| `store_changes(cleaned)` | The write half of a save: stores changes already cleaned by `changes`, encrypted, in one transaction, and calls `invalidate()` when anything was written; an empty dict writes nothing and runs no listener. Takes only what `changes` returned. |
| `complete(values, vendor)` | True when every field of the vendor is non-blank in `values`; `require` and `require_all` are `complete` of `current()` with the error raised. |
| `VENDOR_LABELS` | `{AUTOTASK: "Autotask", DATTO: "Datto"}`, the names used in messages. Must match `VENDOR_LABELS` in the client's [vendors](<../../client/pages/settings/Reporting Settings - vendors.md>), which titles the cards with the same words; a comment on each side points at the other and the client test pins the pair. |
| `invalidate()` | Drops the cached values and runs every registered listener. |
| `on_change(callback)` | Registers a no-argument callable to run after `invalidate()`. |
| `record_test(vendor, ok)` | Stamps the outcome of a connection test on that vendor's stored rows. |
| `require(vendor)` | `current()` when every field of the vendor is set, else `CredentialsMissing` (`<Vendor> credentials are not configured; open Settings`). The integrations call it before a request and read the values it returns. |
| `require_all(vendors)` | `current()` when every listed vendor is set, else one `CredentialsMissing` naming each vendor that is not (`Autotask and Datto credentials are not configured; open Settings`). `require` is `require_all` of one vendor. |
| `CredentialsMissing` | `RuntimeError` subclass: a vendor call was attempted while one of its credentials is blank. |
| `api_base_for(platform)`, `token_url_for(platform)` | `https://<platform>-api.centrastage.net` and `<base>/auth/oauth/token` for any platform label, exactly as config once derived them from `DATTO_PLATFORM`; the Datto integration builds every token request with `token_url_for`, from stored or not yet stored values alike. |
| `datto_api_base()` | `api_base_for` of the current `datto_platform`, the URL root the Datto client reads per request. |

Validation failures raise `ValueError` with a message meant for the user: `Unknown credential: <name>`, `<VARIABLE> is set by the environment; clear it to manage this value here`, `The Autotask base URL must start with https://`, `The Datto platform is the first label of the host you sign in to`.

## Uses

- [secrets](<../core/Reporting Core - secrets.md>) for `encrypt` and `decrypt`.
- [credentials repository](<../repositories/Reporting Repository - credentials.md>), imported as `repo`, for `get_all`, `upsert_many`, `record_test` and `delete_all`.
- `os.environ`, read directly rather than through `settings`: the `Settings` object is frozen at import, and this module must see a variable that is set or cleared afterwards (the tests vary it per case, and an operator clearing a variable to take over a value in the app expects the next restart to honour that).

## Used By

- [autotask integration](<../integrations/Reporting Integration - autotask.md>) (`require` on every request, `on_change` to drop the picklist cache) and [datto integration](<../integrations/Reporting Integration - datto.md>) (`require` and `token_url_for()` when a token is fetched, `datto_api_base` per request, `on_change` to drop the cached token).
- [routers/common](<../routers/Reporting Router - common.md>) maps `CredentialsMissing` to 503.
- [sync service](<Reporting Service - sync.md>) calls `require_all` for both vendors before starting a live sync.
- [server/tests/test_credentials.py](../../../server/tests/test_credentials.py); the `store` and `configured` fixtures in [server/tests/conftest.py](../../../server/tests/conftest.py) serve every test that needs stored values.
- [credentials router](<../routers/Reporting Router - credentials.md>) (`status` for GET, `forget_stored` for DELETE).
- [connection_tests service](<Reporting Service - connection_tests.md>) (`changes`, `merged_from`, `complete`, `store_changes`, `record_test`, `FIELDS`, `VENDOR_LABELS`).
- The Settings page's credentials form reaches it through the router.

## Key Behavior

- Precedence is decided per field, not per vendor: a deployment can inject `DATTO_API_SECRET` and leave the platform to be entered in the app. The environment value is trimmed, and a variable that is set but blank counts as unset.
- One pass decides everything: `_resolve_field` reads the environment, then the store, and returns a `Resolved(value, source)`; the whole map is built on the first call and cached under a lock, and `current()` and `status()` both read that one snapshot, so `configured`, `last4` and `source` describe the same resolution and cannot drift apart between two reads of the environment. Later calls return a copy without touching the environment, the database or the key. Only `invalidate()` clears the cache, so a variable changed in a running process is not seen until something calls `invalidate()` (every `store_changes` that writes does). `secrets.SecretsError` from a stored value that no longer decrypts under the loaded key propagates out of `current()`, `status()` and everything built on them; the test swaps the key file to prove it, and the router maps it when it lands.
- `source` is `environment` when the variable is non-blank, `stored` when the value came from a row, otherwise `missing`. `configured` is simply whether the value is non-blank. Because a blank save never writes a row, a stored row always holds a non-blank value and `stored` always implies `configured`.
- `last4` is the last four characters of a secret field's value, for environment and stored values alike, so the page can tell which key is in place without showing it. It is `""` for non-secret fields, for missing values, and for any secret shorter than twelve characters (`_MIN_HINTED_LENGTH`, three times the hint), so the tail shown is never more than a third of the value. `status()` is the only read path meant for the browser and the test asserts the plaintext never appears in its JSON.
- A save is two calls, `changes` then `store_changes`, and the connection_tests service runs the probes between them. `changes` cleans and validates every entry before anything is written, so a request with one bad field stores nothing; `store_changes` then writes the accepted entries through `repo.upsert_many` in one transaction, so a database failure part way leaves every row as it was. When nothing was accepted (every entry blank) it returns without writing or notifying, so re-posting an untouched form does not make the vendor clients drop their tokens. An unknown name is refused even when its value is blank. A blank or missing value leaves the stored row alone, which is how a form that re-posts every field without retyping a secret keeps it; it also means a value cannot be cleared through a save, only replaced; `forget_stored` clears all of them at once. A non-blank value for a field whose variable is set is refused with the variable's name, so the page can say which one to clear. There is no one-call `save` here on purpose: the only production save is the tested one, and the tests compose the pair through `store_values` in their conftest.
- `autotask_base_url` loses any trailing slash and must start with `https://`; `datto_platform` must match `^[a-z0-9-]+$`, which rejects a full hostname or a URL pasted by mistake. Values are stored after cleaning, so `current()` returns them in the shape the clients expect.
- Listeners run outside the lock, after the cache is cleared, so a listener that calls `current()` sees the new values (a test does exactly that). They are iterated over a copy of the list, so a listener that registers another listener while running does not disturb the loop; the new one runs from the next `invalidate()`. They are stored in module state and are registered once at import by the client that needs them.
- `forget_stored` is deliberately not built on `current()`: resolving would decrypt the rows, and the one time an operator needs this action is when they cannot be decrypted. It deletes first and invalidates after, so a listener that reads `current()` while it runs sees the environment values and blanks, never a `SecretsError`. The test removes the key file, resets the key cache, confirms `current()` raises, and then shows `forget_stored` empties the table and `current()` answers again.
- `record_test` stamps only the vendor's stored rows; a vendor configured through the environment has no rows to stamp, so its status entries keep `last_tested_at` as `None`.
- `changes` is the one validation pass: every entry goes through `_accept` before any value is used, so a test (`merged_from`) and a save (`store_changes`) agree on what a submitted dict means, and a form that re-posts every field with the secrets left blank merges to exactly the stored values.

## Cleanup Notes

- `on_change` has no `off` counterpart and the listener list is never reset outside the tests, which is fine for the one registration per process it is meant for.

## Source

[server/services/credentials.py](../../../server/services/credentials.py)
