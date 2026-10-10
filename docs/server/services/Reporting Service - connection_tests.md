# Connection tests service

> Probes Autotask and Datto with the values the Settings page submits laid over the stored ones, through throwaway clients, and saves values only after every vendor they change has accepted them.

## Purpose

A credential is only known to work once the vendor has accepted it, and the page wants to prove that before a save and again at any later time. This module runs that proof. It builds a throwaway Autotask client and Datto token provider from the merged values through the injection points the integrations expose, asks each integration for its one-call `probe`, and words the outcome for the page with every value in play blanked. `save_tested` is the same test followed by the write: a vendor whose values changed must pass, the other vendor's result is recorded and shown but cannot block. The [credentials service](<Reporting Service - credentials.md>) owns the values and their validation and knows nothing of the integrations; this module is the only service that imports them, which is what keeps the import graph a tree (the integrations import the credentials service at load time).

## Interface

| Name | Description |
|---|---|
| `test_connection(values)` | `{"autotask": {ok, message}, "datto": {ok, message}}` after probing both vendors with `credentials.merged(values)`; records each probed vendor's outcome with `credentials.record_test`. `message` is `Connected`, the integration's failure text with every value in play blanked, or `<Vendor> credentials are incomplete` when a field of that vendor is still blank, in which case no request is made and nothing is recorded for it. Raises `ValueError` from the credentials validators before any probe. |
| `save_tested(values)` | Runs the same probes, raises `ConnectionTestFailed` naming the first changed vendor (in name order) that did not pass, otherwise `credentials.save`s the changes, records the outcomes and returns `credentials.status()`. |
| `ConnectionTestFailed` | `ValueError` subclass: a vendor refused the values submitted for it, so nothing was saved. The message is `<Vendor> refused the credentials: <message>` or `<Vendor> credentials are incomplete`. |
| `redacted(text, values)` | `text` with every non-blank value of `values` replaced by `HIDDEN`, longest first. Passed to the probes as the redaction they apply before the cut. |
| `PROBE_TIMEOUT_SECONDS` | 15: the timeout of the throwaway clients, so a Settings page test gives up well before a report would. |
| `HIDDEN` | `[hidden]`. |

## Uses

- [credentials service](<Reporting Service - credentials.md>) for `merged`, `changes`, `complete`, `save`, `status`, `record_test`, `FIELDS`, `VENDOR_LABELS`, `AUTOTASK` and `DATTO`.
- [autotask integration](<../integrations/Reporting Integration - autotask.md>) for `AutotaskClient`, `connection_from` and `probe`.
- [datto integration](<../integrations/Reporting Integration - datto.md>) for `DattoTokenProvider`, `token_request_from` and `probe`.
- The results are the [http_errors](<../integrations/Reporting Integration - http_errors.md>) `ProbeResult` the probes answer; only `ok` and `message` are read.

## Used By

- [credentials router](<../routers/Reporting Router - credentials.md>) (`test_connection` for `POST /api/credentials/test`, `save_tested` for `PUT /api/credentials`; `ConnectionTestFailed` is a 400 through [routers/common](<../routers/Reporting Router - common.md>)).
- [server/tests/test_connection_tests.py](../../../server/tests/test_connection_tests.py).

## Key Behavior

- A test is the submitted values over the stored ones: `credentials.merged` runs every entry through the validators `save` uses and lays the non-blank results over `current()`, so the form can re-post every field with the secrets left blank and still test what is stored. Both vendors are probed every time, including one whose fields were not touched, because the page wants to know that the stored keys still work. A vendor with a blank field after the merge is reported as incomplete without a request: the clients would raise `CredentialsMissing` or send a request to a host built from an empty platform.
- The probes go through the integrations' injection points: `AutotaskClient(connection=lambda: connection_from(values))` and `DattoTokenProvider(token_request=lambda: token_request_from(values))`, each with `PROBE_TIMEOUT_SECONDS`, then `autotask.probe` (one `Companies/query` for at most one record) and `datto.probe` (one token fetch). The process-wide clients are never touched, so a failed test cannot disturb a report running on the stored values, and this module never sees a URL or header.
- Every message that leaves here has every value in play blanked, not only the secret fields: a vendor's refusal may quote the username or host it was sent, and the page has no more business seeing those than a secret. `redacted` is handed to each probe and runs over the whole refusal body before the integration cuts it to 300 characters, so a value straddling the cut cannot leave a fragment; values are replaced longest first, so one that contains another is blanked whole. The values in play are the merged ones, so a stored secret echoed while its form field was left blank is blanked too. The tests assert a refusal quoting the username and the secret, one placed across the cut, and one stored value echoed with its field blank.
- `save_tested` orders its steps so a new row carries its own result: validate (`changes`), probe, refuse if a changed vendor failed, store, record. Recording before the store would stamp rows that do not exist yet. Only vendors with a non-blank accepted entry can block the save; the other vendor's failure is recorded and visible through `status()` (`last_test_ok` false) but does not stop a rotation of the first vendor's secret.
- A vendor that was not probed is `None` internally and becomes the incomplete report only at the edge (`_report`, `_refusal`), so no code path decides anything by reading a message string.

## Cleanup Notes

- A save that is refused records nothing for the untouched vendor, although its probe ran: the refusal is raised before the recording step, so the stored rows keep their previous outcome.
- `changes` and `merged` each validate the submitted values, so `save_tested` validates twice (and `credentials.save` a third time on already clean values). The validators read the environment and run two regular expressions, so this costs nothing measurable and keeps the credentials service's surface to plain functions.

## Source

[server/services/connection_tests.py](../../../server/services/connection_tests.py)
