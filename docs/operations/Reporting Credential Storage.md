# Credential storage

> How the Autotask and Datto credentials entered on the Settings page are kept, rotated, tested and recovered.

## Purpose

A deployment can run with no vendor credentials in `server/.env` at all. An operator enters the Autotask API user, secret, integration code and zone URL, and the Datto API key, secret and platform, on the Settings page; the server tests each vendor with the submitted values, stores them encrypted in the database and uses them on the next call. A key rotation is a form on a web page rather than a redeploy, and a copy of the database is not a copy of the keys. The server side is the [credentials service](<../server/services/Reporting Service - credentials.md>), the [connection tests](<../server/services/Reporting Service - connection_tests.md>), the [secrets module](<../server/core/Reporting Core - secrets.md>) and the [credentials router](<../server/routers/Reporting Router - credentials.md>); the page is the [Settings credentials section](<../client/pages/settings/Reporting Settings - CredentialsSection.md>).

## Trust model

- Each value is one row in the `credentials` table of `reports.db`, holding a Fernet token (AES-128-CBC with an HMAC, from the `cryptography` package) rather than the value. A token that does not verify under the loaded key is refused rather than decrypted to garbage.
- The master key is kept outside the database. `APP_SECRET_KEY` wins when the deployment sets it; otherwise the server generates `secret.key` in the data directory on first use, created atomically with owner-only permissions on POSIX, and logs one line asking for it to be backed up with the data directory. The Settings page says which of the two is in use.
- Nothing is returned. `GET /api/credentials` reports, per field, whether a value is in place, where it came from (environment, stored or missing), the last four characters of a secret long enough to hint at, when it was saved and the result of its last test. No route returns a stored value, a rejected request body is not echoed back, and a vendor's refusal has every submitted value blanked out before it is cut to length.
- The environment wins. A field with a non-blank variable in `server/.env` is shown as set by the environment and is read-only on the page; a save against it is refused. A deployment that injects its secrets keeps control of them, and an operator who has stored wrong values can override them from the environment without touching the database.
- Demo mode never reaches a vendor, so the cards are disabled and a test or save answers 409 `Demo mode simulates the vendor clients`.

## Rotating a credential

1. Open Settings. The Autotask and Datto cards show each field's status; the inputs are blank, and a blank input keeps the stored value.
2. Enter the new values. A single rotated secret can be entered on its own; the other fields are left blank.
3. Press **Test connection**. The server lays the typed values over the stored ones and makes one cheap call per vendor: an Autotask query capped at one record, and a Datto token request. Both outcomes are shown; nothing is stored.
4. Press **Save**. The save runs the same test again and stores the values only when every vendor whose values changed accepts them; a refusal reports the vendor's message and stores nothing. The cards clear and the status shows the new save and test times.

The next vendor call uses the new values; there is no restart. The vendor clients ask the credentials service for the connection or token request before every call, so even a report already running when the save lands uses them from its next request. On a save the service tells its listeners the values changed: the Datto client drops its cached OAuth token, so the next request authenticates with the new key and secret instead of riding out the old token's hour, and the Autotask client forgets its cached picklist labels, since labels belong to the tenant the old credentials reached and a new zone may be a different tenant.

Running **Test connection** with every field blank re-proves the stored values and records the outcome against them; a vendor tested with typed values is not stamped, because what was tested is not what the rows hold.

## Losing the key

Without the key the stored rows cannot be read. Every route that resolves the credentials, the status call behind the Settings page included, answers 503 `Stored credentials cannot be read; check APP_SECRET_KEY or the key file`, and the background sync skips with a `[WARN]` line in its stream. Recover in one of two ways:

- Restore the key. Put `secret.key` back in the data directory from the volume backup, or set `APP_SECRET_KEY` to the value that was used, and restart the server, which reads the key once.
- Start over. The rows are unreadable under any other key and the page cannot accept new values while they are there, so delete them before re-entering the credentials. With the compose stack:

```bash
docker compose exec server python -c "import sqlite3; c = sqlite3.connect('/app/data/reports.db'); c.execute('DELETE FROM credentials'); c.commit()"
```

Then open Settings and enter the credentials again. Nothing else in the database depends on the key; snapshots, presets, schedules and run history are unaffected.

Generating a new key with the command in `.env.example` and setting `APP_SECRET_KEY` makes the existing rows unreadable in the same way, so a planned move from the key file to the variable is a re-entry of the credentials as well.

## Why the environment still wins

The fork workflow and the compose stack predate the Settings page, and a deployment that already injects its secrets from `.env` or a secret store should not find them silently superseded by a row in a database. Keeping the environment first also gives an operator a way out of a bad save without touching the database, and it keeps the demo stack unchanged. The cost is one rule to know: a variable set in `.env` has to be cleared before that field can be managed in the app, and the page says so.

## Testing without accounts

The demo stack needs no credentials and refuses to store any: the cards are disabled and the test and save endpoints answer 409. To exercise the page itself, start the server without `DEMO_MODE` and without the vendor variables; the cards show every field as not configured, a report page answers 503 naming the vendor and the Settings page, and a test against invented values fails with the vendor's refusal while the `credentials` table stays empty. A local stand-in that answers the Autotask probe over HTTPS (the zone URL is validated to start with `https://`), with the zone URL field pointed at it, is enough to see a save go through and the Autotask rows appear encrypted; a save only tests the vendors whose values changed, so the Datto card can be left alone. The Datto platform always resolves to the vendor's own host, so proving that card needs a real key.
