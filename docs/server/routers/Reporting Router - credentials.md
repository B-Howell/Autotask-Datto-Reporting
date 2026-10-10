# Credentials router

> Show the Settings page which vendor credential is in effect and where it came from, test submitted values against both vendors without saving them, save values once every vendor they change has accepted them, and forget every stored value when the operator asks.

## Purpose

The Settings page is where an operator enters the Autotask and Datto credentials when the deployment does not inject them, and where they check that the ones in place still work. This router is that page's whole API. It never returns a stored value: the page sees each field's source, whether it is configured, the tail of a secret, and when it was last tested. A test runs the submitted values laid over the stored ones through throwaway vendor clients, so a key can be proven before it is saved and a stored key can be re-proven at any time. A save is a test followed by a write, and a vendor that refuses the values it was given blocks the save. A forget removes every stored row without reading it, which is the way back in once the master key is lost. The status comes from the [credentials service](<../services/Reporting Service - credentials.md>) and the tests and the tested save from the [connection_tests service](<../services/Reporting Service - connection_tests.md>); the router parses the body, refuses in demo mode, and maps the services' errors through [common](<Reporting Router - common.md>).

## Interface

| Method | Path | Query/body | Returns | Error mapping |
|---|---|---|---|---|
| GET | `/api/credentials` | none | `{demoMode: bool, keySource: "environment" or "file", fields: [...]}`; each field entry is the service's status shape (`name`, `vendor`, `secret`, `configured`, `source`, `last4`, `updated_at`, `last_tested_at`, `last_test_ok`) and never carries a value | 503 `Stored credentials cannot be read; check APP_SECRET_KEY or the key file` when the key is unusable or a stored value does not decrypt |
| POST | `/api/credentials/test` | JSON `CredentialValues`: `{values: {name: value, ...}}`; a blank value means "use the stored one" | `{autotask: {ok, message}, datto: {ok, message}}` where `message` is `Connected`, `HTTP <status>: <trimmed body>`, `Vendor unreachable: <kind>`, `The answer was not the expected JSON`, or `<Vendor> credentials are incomplete` (a field is still blank after the merge, so no request was made for that vendor) | 409 `Demo mode simulates the vendor clients`; 400 with the service's validation message (`Unknown credential: <name>`, `<VARIABLE> is set by the environment; clear it to manage this value here`, the base URL and platform rules); 503 as above; 422 when `values` is missing or not a string-to-string object, with the usual `type`, `loc` and `msg` per error but no `input` echo |
| PUT | `/api/credentials` | the same body | the GET shape (`demoMode`, `keySource`, `fields`) as it stands after the save, with `last_test_ok` stamped from this test, so the page replaces its status whole | 409 in demo mode; 400 with a validation message, or `<Vendor> refused the credentials: <message>` or `<Vendor> credentials are incomplete` when a vendor whose values changed did not pass its test, in which case nothing is stored; 503 as above |
| DELETE | `/api/credentials` | none | `{forgotten: true}` merged with the GET shape (`demoMode`, `keySource`, `fields`) as it stands once every stored row is gone, so every stored field reads `missing` | 409 in demo mode; never the 503, because nothing stored is read before the delete |

`CredentialValues` is a Pydantic model with one field, `values: dict[str, str]`, so the page posts the form as it stands; which names are valid is the service's decision, not the schema's.

## Uses

- `fastapi` (`APIRouter`, `HTTPException`), `pydantic` (`BaseModel`)
- [config](<../Reporting Server - config.md>) for `demo_mode`
- [secrets](<../core/Reporting Core - secrets.md>) (`key_source`)
- [common](<Reporting Router - common.md>) (`call_or_http_error`)
- [credentials service](<../services/Reporting Service - credentials.md>) (`status`, `forget_stored`)
- [connection_tests service](<../services/Reporting Service - connection_tests.md>) (`test_connection`, `save_tested`)

## Used By

- [main](<../Reporting Server - main.md>) mounts `router`
- [server/tests/test_credentials_routes.py](../../../server/tests/test_credentials_routes.py)
- [Settings credentials section](<../../client/pages/settings/Reporting Settings - CredentialsSection.md>) through the [credentials API](<../../client/api/Reporting API - credentials.md>).

## Key Behavior

- Demo mode is a 409 for the test, the save and the forget, written in `_refuse_in_demo_mode` before the service is called: the demo clients never reach a vendor, so a test would prove nothing, a save would store keys nothing uses, and a forget would remove rows the demo stack never has. GET still answers, with `demoMode: true`, so the page can explain why the form is disabled. `settings` is read through the module's name at request time, which is how the tests switch modes with `dataclasses.replace`.
- Every 200 body with a status in it comes from one helper, `_overview()`: GET returns it, `_save` calls `connection_tests.save_tested` and then returns it, and `_forget` adds `forgotten: true` to it. The services shape no response, so the three routes cannot drift apart, and the client tests replay bodies recorded from these routes (see [the route tests](<../tests/Reporting Server Test Inventory.md>)).
- The 409 is the only status code written here. A `ValueError` from either service (bad input, or the `ConnectionTestFailed` subclass a refused save raises) is a 400 and a `SecretsError` a 503, both through `call_or_http_error`, so the detail is the service's own wording and the page can show it as is.
- GET loads the key through `secrets.key_source()`, which on a fresh install creates `secret.key` in the data directory; a key that cannot be loaded or a stored value encrypted with another key surfaces as the 503 rather than a 500, and the detail names the remedy instead of the key file path.
- The test and the save both run every vendor, not only the one whose fields were typed: the connection_tests service tests the stored values too, so a page that saves a rotated Autotask secret also learns whether the Datto keys still work. Only a vendor whose values changed can block the save; the other vendor's result is recorded on its rows and shown, and nothing more.
- DELETE is the recovery route. `_forget` calls the service's `forget_stored` before it builds the overview, and the service deletes without decrypting, so the route answers 200 after the key file is replaced or `APP_SECRET_KEY` changed, when every other route is the 503. The overview it then returns is built from an empty table, so the fresh status cannot trip the 503 either; the environment-sourced fields keep their `environment` source. The route test proves the whole sequence: a 503 from GET, a 200 from DELETE, a 200 from GET with every field `missing`.
- No response contains a credential. `status()` is the only read path; a refusal's body has every value in play (username and host included, not only the secrets) blanked by the connection_tests service's redaction before the integration cuts it to length, so not even a fragment at the cut survives; and the app's validation handler (`common.validation_error_response`) drops FastAPI's `input` echo from every 422, so a value posted under the wrong type is not sent back either. The route tests assert the stored secret is absent from the body of each response.

## Cleanup Notes

- There is no route to clear one stored value; a save replaces values and never deletes them, and the repository has no single-row delete. DELETE is all or nothing, so clearing one vendor means replacing its values or forgetting everything and re-entering the other vendor.

## Source

[server/routers/credentials.py](../../../server/routers/credentials.py)
