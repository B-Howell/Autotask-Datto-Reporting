# Credentials router

> Show the Settings page which vendor credential is in effect and where it came from, test submitted values against both vendors without saving them, and save values once every vendor they change has accepted them.

## Purpose

The Settings page is where an operator enters the Autotask and Datto credentials when the deployment does not inject them, and where they check that the ones in place still work. This router is that page's whole API. It never returns a stored value: the page sees each field's source, whether it is configured, the tail of a secret, and when it was last tested. A test runs the submitted values laid over the stored ones through throwaway vendor clients, so a key can be proven before it is saved and a stored key can be re-proven at any time. A save is a test followed by a write, and a vendor that refuses the values it was given blocks the save. All of that logic is in the [credentials service](<../services/Reporting Service - credentials.md>); the router parses the body, refuses in demo mode, and maps the service's errors through [common](<Reporting Router - common.md>).

## Interface

| Method | Path | Query/body | Returns | Error mapping |
|---|---|---|---|---|
| GET | `/api/credentials` | none | `{demoMode: bool, keySource: "environment" or "file", fields: [...]}`; each field entry is the service's status shape (`name`, `vendor`, `secret`, `configured`, `source`, `last4`, `updated_at`, `last_tested_at`, `last_test_ok`) and never carries a value | 503 `Stored credentials cannot be read; check APP_SECRET_KEY or the key file` when the key is unusable or a stored value does not decrypt |
| POST | `/api/credentials/test` | JSON `CredentialValues`: `{values: {name: value, ...}}`; a blank value means "use the stored one" | `{autotask: {ok, message}, datto: {ok, message}}` where `message` is `Connected`, `HTTP <status>: <trimmed body>`, `Vendor unreachable: <kind>`, `The answer was not the expected JSON`, or `<Vendor> credentials are incomplete` (a field is still blank after the merge, so no request was made for that vendor) | 409 `Demo mode simulates the vendor clients`; 400 with the service's validation message (`Unknown credential: <name>`, `<VARIABLE> is set by the environment; clear it to manage this value here`, the base URL and platform rules); 503 as above; 422 when `values` is missing or not a string-to-string object, with the usual `type`, `loc` and `msg` per error but no `input` echo |
| PUT | `/api/credentials` | the same body | the status entries after the save, the `fields` list of GET, with `last_test_ok` stamped from this test | 409 in demo mode; 400 with a validation message, or `<Vendor> refused the credentials: <message>` or `<Vendor> credentials are incomplete` when a vendor whose values changed did not pass its test, in which case nothing is stored; 503 as above |

`CredentialValues` is a Pydantic model with one field, `values: dict[str, str]`, so the page posts the form as it stands; which names are valid is the service's decision, not the schema's.

## Uses

- `fastapi` (`APIRouter`, `HTTPException`), `pydantic` (`BaseModel`)
- [config](<../Reporting Server - config.md>) for `demo_mode`
- [secrets](<../core/Reporting Core - secrets.md>) (`key_source`)
- [common](<Reporting Router - common.md>) (`call_or_http_error`)
- [credentials service](<../services/Reporting Service - credentials.md>) (`status`, `test_connection`, `save_tested`)

## Used By

- [main](<../Reporting Server - main.md>) mounts `router`
- [server/tests/test_credentials_routes.py](../../../server/tests/test_credentials_routes.py)
- The Settings page's credentials form, which a later change adds.

## Key Behavior

- Demo mode is a 409 for the test and the save, written in `_refuse_in_demo_mode` before the service is called: the demo clients never reach a vendor, so a test would prove nothing and a save would store keys nothing uses. GET still answers, with `demoMode: true`, so the page can explain why the form is disabled. `settings` is read through the module's name at request time, which is how the tests switch modes with `dataclasses.replace`.
- The 409 is the only status code written here. A `ValueError` from the service (bad input, or the `ConnectionTestFailed` subclass a refused save raises) is a 400 and a `SecretsError` a 503, both through `call_or_http_error`, so the detail is the service's own wording and the page can show it as is.
- GET loads the key through `secrets.key_source()`, which on a fresh install creates `secret.key` in the data directory; a key that cannot be loaded or a stored value encrypted with another key surfaces as the 503 rather than a 500, and the detail names the remedy instead of the key file path.
- The test and the save both run every vendor, not only the one whose fields were typed: the service tests the stored values too, so a page that saves a rotated Autotask secret also learns whether the Datto keys still work. Only a vendor whose values changed can block the save; the other vendor's result is recorded on its rows and shown, and nothing more.
- No response contains a credential. `status()` is the only read path; a refusal's body has every secret value blanked by the service's redaction before the integration cuts it to length, so not even a fragment at the cut survives; and the app's validation handler (`common.validation_error_response`) drops FastAPI's `input` echo from every 422, so a value posted under the wrong type is not sent back either. The route tests assert the stored secret is absent from the body of each response.

## Cleanup Notes

- There is no route to clear a stored value; the service replaces values and never deletes them, and the repository's `delete` is not exposed. Clearing a vendor means replacing its values or removing the row by hand.
- PUT answers the bare `fields` list while GET wraps it with `demoMode` and `keySource`; the page keeps the wrapper from GET and replaces only the list after a save.

## Source

[server/routers/credentials.py](../../../server/routers/credentials.py)
