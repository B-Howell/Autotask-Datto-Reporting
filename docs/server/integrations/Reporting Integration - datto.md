# Datto integration

> The Datto RMM REST client: a locked OAuth token provider, paced and retried GETs, paged device listings and the per-device audit endpoints.

## Purpose

Datto rate-limits an account to 600 reads a minute and a full sync audits well over a thousand devices, one or two calls each, from several worker threads at once. This module makes that survivable: every request is spaced out, 429 and 5xx answers are retried with backoff, and an expired token is refreshed without the caller noticing. Services call `datto()` and never build a URL or header.

## Interface

| Name | Description |
|---|---|
| `DattoTokenProvider(token_url, api_key, api_secret, timeout=30)` | Caches the OAuth access token; `token()` returns a live one, `invalidate()` drops it. |
| `DattoClient(api_base, tokens, timeout, min_request_interval, max_workers)` | The HTTP client. `max_workers` is exposed as a public attribute for the audit thread pool. |
| `get(path, params=None, attempts=3, logger=None, tag="")` | GET under `/api/v2/`; returns the `Response` on 200, another 4xx response as-is, or None once attempts are spent. |
| `get_json(path, ...)` | Decoded body of a 200, otherwise None. |
| `paged(path, params=None, page_size=200, ...)` | Every item of a collection endpoint (`devices` key), raising `RuntimeError` when any page fails. |
| `site_devices(site_uid, ...)` | `GET site/<uid>/devices`, paged. |
| `account_devices(site_uid=None, ...)` | `GET account/devices`, optionally filtered by `siteUid`, paged. |
| `device_software(device_uid, ...)` | Installed software list from `audit/device/<uid>/software`, or None. |
| `device_audit(device_uid, ...)` | Hardware audit from `audit/device/<uid>` (memory modules, logical disks), or None. |
| `datto()` | The lazily built singleton, constructed from `settings` under a lock. |

## Uses

- `requests` and `requests.auth.HTTPBasicAuth`.
- [config](<../Reporting Server - config.md>) for `datto_api_base`, `datto_token_url`, `datto_api_key`, `datto_api_secret`, `datto_timeout`, `datto_min_request_interval`, `datto_max_workers`.

## Used By

- [device_audit service](<../services/Reporting Service - device_audit.md>) (software and hardware audits, site and account device lists, `max_workers`)
- [devices service](<../services/Reporting Service - devices.md>) (`account_devices` for last-seen)
- [office_windows service](<../services/Reporting Service - office_windows.md>) (`site_devices` for live OS strings)
- [patch_management service](<../services/Reporting Service - patch_management.md>) (`site_devices`)

## Key Behavior

- Token provider lock: `token()` holds a `Lock` for the whole check-and-refresh, so when the cached token expires, concurrent audit workers wait for one refresh instead of each posting for their own. The token is treated as expired `_EXPIRY_SKEW_SECONDS` (60) before the advertised `expires_in`, so a request that starts near the deadline does not go out with a token that dies in flight. The POST uses the password grant with the API key and secret as credentials and the documented public client as basic auth.
- Token fetch is outside the retry loop in `get`, so a rejected key or secret surfaces as the OAuth error itself rather than as three failed GETs.
- Pacing: `_pace` keeps a monotonic timestamp of the last request behind `_pace_lock` and sleeps until `min_request_interval` has elapsed. The lock is shared across threads, so the interval bounds the whole process, not each worker. An interval of 0 or less disables pacing.
- Retry: up to `attempts` (3) tries with a delay starting at 1 second and doubling. A `requests.RequestException` (timeout, connection error) retries; 429 and any 5xx retry, honouring a numeric `Retry-After` header as the delay; 401 and 403 call `invalidate()` and retry so the next try re-authenticates. Any other 4xx (such as 404) is returned immediately for the caller to interpret. When the last attempt fails the method logs a `[WARN]` with the caller's `tag` and returns None.
- `get_json` folds "no response" and "non-200 response" into None, which is why the audit helpers treat None as "audit unavailable" and log it loudly: a timed-out audit would otherwise look like a device with no Office.
- `paged` walks `page` from 0 with `pageSize` 200 until a page has no `devices`; one failed page aborts the whole listing with `RuntimeError`, so a device list is never silently truncated.
- Timeouts: `datto_timeout` (settings, default 30 seconds) applies to every GET; the token POST has its own fixed 30 second timeout.

## Cleanup Notes

- `_RETRY_STATUSES` holds only 429; the 5xx check is a separate comparison, so the constant is less general than its name suggests.

## Source

[server/integrations/datto.py](../../../server/integrations/datto.py)
