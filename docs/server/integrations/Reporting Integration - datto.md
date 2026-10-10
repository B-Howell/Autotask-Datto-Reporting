# Datto integration

> The Datto RMM REST client: a locked OAuth token provider that reads the key, secret and platform from the registered credential source when it fetches, paced and retried GETs, paged device listings and the per-device audit endpoints.

## Purpose

Datto rate-limits an account to 600 reads a minute and a full sync audits well over a thousand devices, one or two calls each, from several worker threads at once. This module makes that survivable: every request is spaced out, 429 and 5xx answers are retried with backoff, and an expired token is refreshed without the caller noticing. Services call `datto()` and never build a URL or header.

## Interface

| Name | Description |
|---|---|
| `TokenRequest(url, api_key, api_secret)` | Frozen dataclass: where a token is fetched from and the credentials that earn it. |
| `token_url_for(platform)` | `credential_source.api_base_for(platform)` plus `/auth/oauth/token` (`_TOKEN_PATH`): the OAuth endpoint for any platform label, stored or not yet stored. The path is this client's knowledge, so the source only answers the REST base. |
| `token_request_from(values)` | The `TokenRequest` the given credential values describe: `token_url_for(values["datto_platform"])` with `datto_api_key` and `datto_api_secret`. |
| `current_token_request()` | `token_request_from` of the credentials in effect. Calls `credential_source.require(DATTO)` first, so a blank field raises the source's `CredentialsMissing` before any request. |
| `forget_token()` | Drops the process-wide token provider's cached token, so the next request authenticates afresh; [main](<../Reporting Server - main.md>) registers it with `credential_source.on_change`. |
| `DattoTokenProvider(token_request=current_token_request, timeout=30)` | Caches the OAuth access token; `token()` returns a live one, calling `token_request()` only when it has to fetch, and `invalidate()` drops it. |
| `probe(provider, redact=http_errors.unchanged)` | The connection test: `provider.token()` run through `http_errors.probe`, so a refused key or an unknown platform answers a `ProbeResult` rather than raising; `redact` runs over a refusal's body before it is cut to length. No API call follows the token. |
| `DattoClient(api_base, tokens, timeout, min_request_interval, max_workers)` | The HTTP client. `api_base()` is called per request for the URL root. `max_workers` is exposed as a public attribute for the audit thread pool. |
| `get(path, params=None, attempts=3, logger=None, tag="")` | GET under `/api/v2/`; returns the `Response` on 200, another 4xx response as-is, or None once attempts are spent. |
| `get_json(path, ...)` | Decoded body of a 200, otherwise None. |
| `paged(path, params=None, page_size=200, ...)` | Every item of a collection endpoint (`devices` key), raising `RuntimeError` when any page fails. |
| `site_devices(site_uid, ...)` | `GET site/<uid>/devices`, paged. |
| `account_devices(site_uid=None, ...)` | `GET account/devices`, optionally filtered by `siteUid`, paged. |
| `device_software(device_uid, ...)` | Installed software list from `audit/device/<uid>/software`, or None. |
| `device_audit(device_uid, ...)` | Hardware audit from `audit/device/<uid>` (memory modules, logical disks), or None. |
| `datto()` | The lazily built singleton, constructed under a lock: the module-level token provider, `credential_source.datto_api_base` as the URL root, and the three pacing values from `settings`. |

## Uses

- `requests` and `requests.auth.HTTPBasicAuth`.
- [config](<../Reporting Server - config.md>) for `datto_timeout`, `datto_min_request_interval`, `datto_max_workers`.
- [credential_source](<../core/Reporting Core - credential_source.md>) for `require` (which returns the current values), `api_base_for()`, `datto_api_base()` and `DATTO`. The module imports no service; the [credentials service](<../services/Reporting Service - credentials.md>) is what [main](<../Reporting Server - main.md>) registers there.
- [http_errors](<Reporting Integration - http_errors.md>) for `probe`, which words a refused test without the URL.

## Used By

- [device_audit service](<../services/Reporting Service - device_audit.md>) (software and hardware audits, site and account device lists, `max_workers`)
- [devices service](<../services/Reporting Service - devices.md>) (`account_devices` for last-seen)
- [office_windows service](<../services/Reporting Service - office_windows.md>) (`site_devices` for live OS strings)
- [patch_management service](<../services/Reporting Service - patch_management.md>) (`site_devices`)
- [connection_tests service](<../services/Reporting Service - connection_tests.md>) builds a throwaway `DattoTokenProvider(token_request=lambda: token_request_from(values))` and calls `probe` on it for a Settings page test.
- [server/tests/test_datto_client.py](../../../server/tests/test_datto_client.py) drives `datto()` with a stand-in for `requests`, and the probe with a throwaway provider.

## Key Behavior

- Credentials at call time: the token provider asks `token_request()` for the URL, key and secret only when it has no live token, and the client asks `api_base()` for the URL root on every GET, so nothing credential-derived outlives the values it came from. `main.wire_vendor_clients()` registers `forget_token` with `credential_source.on_change`, so a save on the Settings page drops the cached token and the next request authenticates with the new key against the new platform, with no restart; the registration lives in `main` because the source is registered there too, after this module is imported. A blank field raises the credentials service's `CredentialsMissing` (`Datto credentials are not configured; open Settings`) from the token fetch, before any HTTP call; [routers/common](<../routers/Reporting Router - common.md>) maps it to 503.
- Token provider lock: `token()` holds a `Lock` for the whole check-and-refresh, so when the cached token expires, concurrent audit workers wait for one refresh instead of each posting for their own. `invalidate()` takes the same lock, so a save that lands during a fetch waits for it and drops the token that fetch earned with the old values. The token is treated as expired `_EXPIRY_SKEW_SECONDS` (60) before the advertised `expires_in`, so a request that starts near the deadline does not go out with a token that dies in flight. The POST uses the password grant with the API key and secret as credentials and the documented public client as basic auth.
- Token fetch is outside the retry loop in `get`, so a rejected key or secret surfaces as the OAuth error itself rather than as three failed GETs.
- Pacing: `_pace` keeps a monotonic timestamp of the last request behind `_pace_lock` and sleeps until `min_request_interval` has elapsed. The lock is shared across threads, so the interval bounds the whole process, not each worker. An interval of 0 or less disables pacing.
- Retry: up to `attempts` (3) tries with a delay starting at 1 second and doubling. A `requests.RequestException` (timeout, connection error) retries; 429 and any 5xx retry, honouring a numeric `Retry-After` header as the delay; 401 and 403 call `invalidate()` and retry so the next try re-authenticates. Any other 4xx (such as 404) is returned immediately for the caller to interpret. When the last attempt fails the method logs a `[WARN]` with the caller's `tag` and returns None.
- `get_json` folds "no response" and "non-200 response" into None, which is why the audit helpers treat None as "audit unavailable" and log it loudly: a timed-out audit would otherwise look like a device with no Office.
- `paged` walks `page` from 0 with `pageSize` 200 until a page has no `devices`; one failed page aborts the whole listing with `RuntimeError`, so a device list is never silently truncated.
- Timeouts: `datto_timeout` (settings, default 30 seconds) applies to every GET; the token POST has its own fixed `_TOKEN_TIMEOUT_SECONDS` (30), and a probe's provider is built with the connection_tests service's shorter `PROBE_TIMEOUT_SECONDS`.
- The connection test is the token POST alone: the password grant to `https://<platform>-api.centrastage.net/auth/oauth/token` with the key and secret, which is the one call that proves all three Datto fields at once. The provider is a throwaway, so the token it earns is never cached for a report, and the process-wide provider is untouched by a failed test. A 401 from a bad key, a name resolution failure from a platform label that is not a Datto host, or a 200 without `access_token` each come back as a `ProbeResult` with a message that holds the status and trimmed body, the failure's kind, or the not-JSON wording, never the URL.

## Cleanup Notes

- `_RETRY_STATUSES` holds only 429; the 5xx check is a separate comparison, so the constant is less general than its name suggests.

## Source

[server/integrations/datto.py](../../../server/integrations/datto.py)
